import "server-only";
import { db } from "@/lib/db";
import { diffFields } from "@/lib/domain/activity-diff";
import { notify } from "@/services/notification-service";
import { nextState, prevState, canAdvance, canMoveBack } from "@/lib/domain/lifecycle";
import type { OpportunityCreateInput, OpportunityUpdateInput } from "@/schemas/opportunity";

export async function createOpportunity(input: OpportunityCreateInput, userId: string) {
  return db.$transaction(async (tx) => {
    const o = await tx.opportunity.create({
      data: {
        accountId: input.accountId,
        title: input.title,
        description: input.description,
        accountableId: input.accountableId,
        revenue: input.revenue,
        marginPct: input.marginPct,
        createdById: userId,
        lastModifiedById: userId,
      },
    });
    await tx.activityLog.create({ data: { opportunityId: o.id, userId, actionType: "created" } });
    // Assignment notification: tell the accountable if they didn't create it themselves
    if (o.accountableId !== userId) await notify(tx, o.accountableId, o.id, "assignment", `You were assigned "${o.title}"`);
    return o;
  });
}

export async function updateOpportunity(id: string, input: OpportunityUpdateInput, userId: string) {
  return db.$transaction(async (tx) => {
    const before = await tx.opportunity.findUniqueOrThrow({ where: { id } });
    const after = {
      title: input.title,
      description: input.description ?? null,
      accountableId: input.accountableId,
      statusId: input.statusId || null,
      revenue: input.revenue,
      marginPct: input.marginPct,
    };
    const changes = diffFields(
      { title: before.title, description: before.description, accountableId: before.accountableId, statusId: before.statusId, revenue: Number(before.revenue), marginPct: Number(before.marginPct) },
      { ...after, revenue: after.revenue, marginPct: after.marginPct }
    );
    const updated = await tx.opportunity.update({
      where: { id },
      data: { ...after, lastModifiedAt: new Date(), lastModifiedById: userId },
    });
    for (const c of changes) {
      await tx.activityLog.create({ data: { opportunityId: id, userId, actionType: "updated", ...c } });
    }
    // Assignment notification: tell the new accountable if accountability changed to someone else
    if (after.accountableId !== before.accountableId && after.accountableId !== userId) {
      await notify(tx, after.accountableId, id, "assignment", `You were assigned "${after.title}"`);
    }
    return updated;
  });
}

export async function listOpportunities() {
  return db.opportunity.findMany({
    orderBy: { lastModifiedAt: "desc" },
    include: { account: true, accountable: true, status: true, tags: { include: { tag: true } } },
  });
}

export async function getOpportunity(id: string) {
  return db.opportunity.findUnique({
    where: { id },
    include: {
      account: true, accountable: true, status: true,
      tags: { include: { tag: true } },
      comments: { where: { deletedAt: null }, include: { author: true }, orderBy: { createdAt: "asc" } },
      activities: { orderBy: { createdAt: "desc" } },
    },
  });
}

export type TransitionKind = "advance" | "back" | "cancel";

export async function transitionOpportunity(id: string, kind: TransitionKind, userId: string, reason?: string) {
  return db.$transaction(async (tx) => {
    const o = await tx.opportunity.findUniqueOrThrow({ where: { id } });
    if (o.isCancelled) throw new Error("Opportunity is cancelled");

    let newState = o.state;
    let isCancelled: boolean = o.isCancelled;

    if (kind === "advance") {
      if (!canAdvance(o.state)) throw new Error("Cannot advance past the final state");
      newState = nextState(o.state)!;
    } else if (kind === "back") {
      if (!reason) throw new Error("A reason is required to move back");
      if (!canMoveBack(o.state)) throw new Error("Cannot move back from the first state");
      newState = prevState(o.state)!;
    } else {
      if (!reason) throw new Error("A reason is required to cancel");
      isCancelled = true;
    }

    const updated = await tx.opportunity.update({
      where: { id },
      data: { state: newState, isCancelled, statusId: kind === "cancel" ? o.statusId : null, lastReason: reason ?? null, lastModifiedAt: new Date(), lastModifiedById: userId },
    });

    await tx.activityLog.create({
      data: { opportunityId: id, userId, actionType: kind, fieldChanged: "state", oldValue: o.state, newValue: isCancelled ? "CANCELLED" : newState },
    });

    if (o.accountableId !== userId) {
      const verb = kind === "cancel" ? "was cancelled" : `moved to ${newState}`;
      await notify(tx, o.accountableId, id, "state", `"${o.title}" ${verb}`);
    }

    return updated;
  });
}

export async function attachTag(opportunityId: string, tagId: string, userId: string) {
  await db.$transaction(async (tx) => {
    await tx.opportunityTag.create({ data: { opportunityId, tagId } });
    const tag = await tx.tag.findUniqueOrThrow({ where: { id: tagId } });
    await tx.activityLog.create({ data: { opportunityId, userId, actionType: "tag-added", newValue: tag.label } });
    await tx.opportunity.update({ where: { id: opportunityId }, data: { lastModifiedAt: new Date(), lastModifiedById: userId } });
  });
}

export async function detachTag(opportunityId: string, tagId: string, userId: string) {
  await db.$transaction(async (tx) => {
    await tx.opportunityTag.delete({ where: { opportunityId_tagId: { opportunityId, tagId } } });
    const tag = await tx.tag.findUniqueOrThrow({ where: { id: tagId } });
    await tx.activityLog.create({ data: { opportunityId, userId, actionType: "tag-removed", oldValue: tag.label } });
    await tx.opportunity.update({ where: { id: opportunityId }, data: { lastModifiedAt: new Date(), lastModifiedById: userId } });
  });
}
