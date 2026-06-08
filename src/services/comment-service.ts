import "server-only";
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

export async function deleteComment(id: string) {
  return db.comment.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function listComments(opportunityId: string) {
  return db.comment.findMany({ where: { opportunityId, deletedAt: null }, include: { author: true }, orderBy: { createdAt: "asc" } });
}
