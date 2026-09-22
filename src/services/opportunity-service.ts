import "server-only";
import type { Prisma, Stage } from "@prisma/client";
import { db } from "@/lib/db";
import { diffFields } from "@/lib/domain/activity-diff";
import { notify } from "@/services/notification-service";
import { audit } from "@/services/audit-service";
import { opportunityRef } from "@/lib/format";
import { ORDER, nextStage, prevStage, canAdvance, canMoveBack } from "@/lib/domain/lifecycle";
import { MAX_TAGS, MIN_TAGS, type OpportunityCreateInput, type OpportunityFieldInput, type OpportunityUpdateInput } from "@/schemas/opportunity";

type Tx = Prisma.TransactionClient;

/** Throws unless the status exists and belongs to the given stage. */
async function assertStatusInStage(tx: Tx, statusId: string, stage: Stage) {
  const status = await tx.status.findUnique({ where: { id: statusId } });
  if (!status || status.stage !== stage) throw new Error("Status does not belong to this stage");
}

export async function createOpportunity(input: OpportunityCreateInput, userId: string) {
  return db.$transaction(async (tx) => {
    const stage = input.stage ?? "PROSPECT";
    const statusId = input.statusId || null;
    if (statusId) await assertStatusInStage(tx, statusId, stage);
    const tagIds = [...new Set(input.tagIds ?? [])];
    const tags = tagIds.length ? await tx.tag.findMany({ where: { id: { in: tagIds }, stage, isActive: true } }) : [];
    if (tags.length !== tagIds.length) throw new Error("A tag does not belong to this stage");
    if (tagIds.length > MAX_TAGS) throw new Error(`An opportunity can have at most ${MAX_TAGS} tags`);
    const o = await tx.opportunity.create({
      data: {
        accountId: input.accountId,
        title: input.title,
        description: input.description,
        accountableId: input.accountableId,
        stage,
        statusId,
        revenue: input.revenue,
        marginPct: input.marginPct,
        createdById: userId,
        lastModifiedById: userId,
        statusChangedAt: new Date(),
        tags: { create: tags.map((t) => ({ tagId: t.id })) },
      },
      include: { status: true },
    });
    await tx.activityLog.create({ data: { opportunityId: o.id, userId, actionType: "created", fieldChanged: "stage", newValue: stage } });
    for (const t of tags) await tx.activityLog.create({ data: { opportunityId: o.id, userId, actionType: "tag-added", newValue: t.label } });
    await audit(tx, {
      userId, action: "opportunity.create", entityType: "opportunity", entityId: o.id,
      summary: `Created ${opportunityRef(o.number)} "${o.title}" in ${stage}${o.status ? ` / ${o.status.label}` : ""}${tags.length ? ` [${tags.map((t) => t.label).join(", ")}]` : ""}`,
    });
    // Assignment notification: tell the accountable if they didn't create it themselves
    if (o.accountableId !== userId) await notify(tx, o.accountableId, o.id, "assignment", `You were assigned "${o.title}"`);
    return o;
  });
}

type Editable = { title: string; description: string | null; accountableId: string; statusId: string | null; revenue: number; marginPct: number };

/** Apply a partial edit: logs each changed field, audits, and notifies a newly accountable user. */
async function applyChanges(id: string, patch: Partial<Editable>, userId: string) {
  return db.$transaction(async (tx) => {
    const before = await tx.opportunity.findUniqueOrThrow({ where: { id } });
    const current: Editable = {
      title: before.title, description: before.description, accountableId: before.accountableId,
      statusId: before.statusId, revenue: Number(before.revenue), marginPct: Number(before.marginPct),
    };
    const after: Editable = { ...current, ...patch };
    const changes = diffFields(current, after);
    if (changes.length === 0) return before;
    if (after.statusId && after.statusId !== before.statusId) await assertStatusInStage(tx, after.statusId, before.stage);

    const now = new Date();
    const updated = await tx.opportunity.update({
      where: { id },
      // statusChangedAt is what the dashboard buckets by month, so only a real status change moves it.
      data: { ...after, lastModifiedAt: now, lastModifiedById: userId, ...(after.statusId !== before.statusId && { statusChangedAt: now }) },
    });
    for (const c of changes) {
      await tx.activityLog.create({ data: { opportunityId: id, userId, actionType: "updated", ...c } });
    }
    await audit(tx, {
      userId, action: "opportunity.update", entityType: "opportunity", entityId: id,
      summary: `Updated ${opportunityRef(updated.number)} (${changes.map((c) => c.fieldChanged).join(", ")})`,
      details: changes.map((c) => ({ ...c })),
    });
    // Assignment notification: tell the new accountable if accountability changed to someone else
    if (after.accountableId !== before.accountableId && after.accountableId !== userId) {
      await notify(tx, after.accountableId, id, "assignment", `You were assigned "${after.title}"`);
    }
    return updated;
  });
}

export async function updateOpportunity(id: string, input: OpportunityUpdateInput, userId: string) {
  return applyChanges(id, {
    title: input.title,
    description: input.description ?? null,
    accountableId: input.accountableId,
    statusId: input.statusId || null,
    revenue: input.revenue,
    marginPct: input.marginPct,
  }, userId);
}

/** Inline table edit of a single field. Stage changes go through setOpportunityStage. */
export async function updateOpportunityField(id: string, input: Exclude<OpportunityFieldInput, { field: "stage" }>, userId: string) {
  const value = input.field === "statusId" ? input.value || null : input.value;
  return applyChanges(id, { [input.field]: value }, userId);
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

export type TransitionKind = "advance" | "back";

export async function transitionOpportunity(id: string, kind: TransitionKind, userId: string) {
  const o = await db.opportunity.findUniqueOrThrow({ where: { id } });
  if (kind === "advance" && !canAdvance(o.stage)) throw new Error("Cannot advance past the final stage");
  if (kind === "back" && !canMoveBack(o.stage)) throw new Error("Cannot move back from the first stage");
  return setOpportunityStage(id, kind === "advance" ? nextStage(o.stage)! : prevStage(o.stage)!, userId);
}

/** Move to any stage. Clears the status, since statuses belong to a stage. */
export async function setOpportunityStage(id: string, newStage: Stage, userId: string) {
  return db.$transaction(async (tx) => {
    const o = await tx.opportunity.findUniqueOrThrow({ where: { id } });
    if (newStage === o.stage) return o;
    const kind: TransitionKind = ORDER.indexOf(newStage) > ORDER.indexOf(o.stage) ? "advance" : "back";

    const updated = await tx.opportunity.update({
      where: { id },
      // The stage move clears the status, which counts as a status change.
      data: { stage: newStage, statusId: null, lastReason: null, lastModifiedAt: new Date(), statusChangedAt: new Date(), lastModifiedById: userId },
    });

    await tx.activityLog.create({
      data: { opportunityId: id, userId, actionType: kind, fieldChanged: "stage", oldValue: o.stage, newValue: newStage },
    });

    await audit(tx, {
      userId, action: `opportunity.${kind}`, entityType: "opportunity", entityId: id,
      summary: `Moved ${opportunityRef(o.number)} from ${o.stage} to ${newStage}`,
    });

    if (o.accountableId !== userId) {
      await notify(tx, o.accountableId, id, "stage", `"${o.title}" moved to ${newStage}`);
    }

    return updated;
  });
}

export async function attachTag(opportunityId: string, tagId: string, userId: string) {
  await db.$transaction(async (tx) => {
    const count = await tx.opportunityTag.count({ where: { opportunityId } });
    if (count >= MAX_TAGS) throw new Error(`An opportunity can have at most ${MAX_TAGS} tags`);
    await tx.opportunityTag.create({ data: { opportunityId, tagId } });
    const tag = await tx.tag.findUniqueOrThrow({ where: { id: tagId } });
    await tx.activityLog.create({ data: { opportunityId, userId, actionType: "tag-added", newValue: tag.label } });
    const o = await tx.opportunity.update({ where: { id: opportunityId }, data: { lastModifiedAt: new Date(), lastModifiedById: userId } });
    await audit(tx, { userId, action: "opportunity.tag-add", entityType: "opportunity", entityId: opportunityId, summary: `Added tag "${tag.label}" to ${opportunityRef(o.number)}` });
  });
}

export async function detachTag(opportunityId: string, tagId: string, userId: string) {
  await db.$transaction(async (tx) => {
    const count = await tx.opportunityTag.count({ where: { opportunityId } });
    if (count <= MIN_TAGS) throw new Error(`An opportunity must keep at least ${MIN_TAGS} tag`);
    await tx.opportunityTag.delete({ where: { opportunityId_tagId: { opportunityId, tagId } } });
    const tag = await tx.tag.findUniqueOrThrow({ where: { id: tagId } });
    await tx.activityLog.create({ data: { opportunityId, userId, actionType: "tag-removed", oldValue: tag.label } });
    const o = await tx.opportunity.update({ where: { id: opportunityId }, data: { lastModifiedAt: new Date(), lastModifiedById: userId } });
    await audit(tx, { userId, action: "opportunity.tag-remove", entityType: "opportunity", entityId: opportunityId, summary: `Removed tag "${tag.label}" from ${opportunityRef(o.number)}` });
  });
}
