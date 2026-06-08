import "server-only";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { notify } from "@/services/notification-service";

export async function addComment(opportunityId: string, body: string, authorId: string) {
  return db.$transaction(async (tx) => {
    const comment = await tx.comment.create({ data: { opportunityId, body, authorId } });
    const o = await tx.opportunity.findUniqueOrThrow({ where: { id: opportunityId } });
    if (o.ownerId !== authorId) await notify(tx, o.ownerId, opportunityId, "comment", `New comment on "${o.title}"`);
    return comment;
  });
}

export async function deleteComment(id: string, userId: string, role: Role) {
  return db.$transaction(async (tx) => {
    const comment = await tx.comment.findUniqueOrThrow({ where: { id } });
    const elevated = role === "ADMIN" || role === "MANAGER";
    if (comment.authorId !== userId && !elevated) throw new Error("Forbidden");
    const deleted = await tx.comment.update({ where: { id }, data: { deletedAt: new Date() } });
    await tx.activityLog.create({ data: { opportunityId: comment.opportunityId, userId, actionType: "comment-deleted" } });
    await tx.opportunity.update({
      where: { id: comment.opportunityId },
      data: { lastModifiedAt: new Date(), lastModifiedById: userId },
    });
    return deleted;
  });
}

export async function listComments(opportunityId: string) {
  return db.comment.findMany({ where: { opportunityId, deletedAt: null }, include: { author: true }, orderBy: { createdAt: "asc" } });
}
