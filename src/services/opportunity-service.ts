import "server-only";
import { db } from "@/lib/db";
import { diffFields } from "@/lib/domain/activity-diff";
import { notify } from "@/services/notification-service";
import { nextState, prevState, canAdvance, canMoveBack } from "@/lib/domain/lifecycle";
import type { OpportunityCreateInput, OpportunityUpdateInput } from "@/schemas/opportunity";

function parseMeeting(v?: string): Date | null {
  return v ? new Date(v) : null;
}

export async function createOpportunity(input: OpportunityCreateInput, userId: string) {
  return db.$transaction(async (tx) => {
    const o = await tx.opportunity.create({
      data: {
        accountId: input.accountId,
        title: input.title,
        description: input.description,
        ownerId: input.ownerId,
        revenue: input.revenue,
        marginPct: input.marginPct,
        meetingAt: parseMeeting(input.meetingAt),
        createdById: userId,
        lastModifiedById: userId,
      },
    });
    await tx.activityLog.create({ data: { opportunityId: o.id, userId, actionType: "created" } });
    // Assignment notification: tell the owner if they didn't create it themselves
    if (o.ownerId !== userId) await notify(tx, o.ownerId, o.id, "assignment", `You were assigned "${o.title}"`);
    return o;
  });
}

export async function updateOpportunity(id: string, input: OpportunityUpdateInput, userId: string) {
  return db.$transaction(async (tx) => {
    const before = await tx.opportunity.findUniqueOrThrow({ where: { id } });
    const after = {
      title: input.title,
      description: input.description ?? null,
      ownerId: input.ownerId,
      statusId: input.statusId || null,
      revenue: input.revenue,
      marginPct: input.marginPct,
      meetingAt: parseMeeting(input.meetingAt),
    };
    const changes = diffFields(
      { title: before.title, description: before.description, ownerId: before.ownerId, statusId: before.statusId, revenue: Number(before.revenue), marginPct: Number(before.marginPct), meetingAt: before.meetingAt?.toISOString() ?? null },
      { ...after, revenue: after.revenue, marginPct: after.marginPct, meetingAt: after.meetingAt?.toISOString() ?? null }
    );
    const updated = await tx.opportunity.update({
      where: { id },
      data: { ...after, lastModifiedAt: new Date(), lastModifiedById: userId },
    });
    for (const c of changes) {
      await tx.activityLog.create({ data: { opportunityId: id, userId, actionType: "updated", ...c } });
    }
    // Assignment notification: tell the new owner if ownership changed to someone else
    if (after.ownerId !== before.ownerId && after.ownerId !== userId) {
      await notify(tx, after.ownerId, id, "assignment", `You were assigned "${after.title}"`);
    }
    return updated;
  });
}

export async function listOpportunities() {
  return db.opportunity.findMany({
    orderBy: { lastModifiedAt: "desc" },
    include: { account: true, owner: true, status: true, tags: { include: { tag: true } } },
  });
}

export async function getOpportunity(id: string) {
  return db.opportunity.findUnique({
    where: { id },
    include: {
      account: true, owner: true, status: true,
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

    if (o.ownerId !== userId) {
      const verb = kind === "cancel" ? "was cancelled" : `moved to ${newState}`;
      await notify(tx, o.ownerId, id, "state", `"${o.title}" ${verb}`);
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
