import "server-only";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { notify } from "@/services/notification-service";
import { audit } from "@/services/audit-service";
import { opportunityRef } from "@/lib/format";
import { parseMentions, plainText, ROLE_MENTIONS } from "@/lib/mentions";

export async function addComment(opportunityId: string, body: string, authorId: string) {
  return db.$transaction(async (tx) => {
    const comment = await tx.comment.create({ data: { opportunityId, body, authorId } });
    const o = await tx.opportunity.findUniqueOrThrow({ where: { id: opportunityId } });
    const author = await tx.user.findUniqueOrThrow({ where: { id: authorId } });
    // Only real, active users other than the author get mention notifications.
    // Group mentions (@Admins, @Managers) expand to everyone with that role; a direct mention wins over a group one.
    const ids = parseMentions(body);
    const groups = ROLE_MENTIONS.filter((r) => ids.includes(r.id));
    const direct = await tx.user.findMany({ where: { id: { in: ids.filter((id) => id !== authorId) }, blockedAt: null }, select: { id: true } });
    const viaGroup = groups.length
      ? await tx.user.findMany({ where: { role: { in: groups.map((g) => g.role) }, blockedAt: null, id: { not: authorId } }, select: { id: true, role: true } })
      : [];
    const where = `on ${opportunityRef(o.number)} "${o.title}"`;
    for (const u of direct) {
      await notify(tx, u.id, opportunityId, "mention", `${author.name} mentioned you ${where}`);
    }
    const directIds = new Set(direct.map((u) => u.id));
    for (const u of viaGroup.filter((u) => !directIds.has(u.id))) {
      const group = groups.find((g) => g.role === u.role)!.name;
      await notify(tx, u.id, opportunityId, "mention", `${author.name} mentioned ${group} ${where}`);
    }
    const mentioned = [...direct, ...viaGroup.filter((u) => !directIds.has(u.id))];
    const mentionedIds = new Set(mentioned.map((u) => u.id));
    if (o.accountableId !== authorId && !mentionedIds.has(o.accountableId)) {
      await notify(tx, o.accountableId, opportunityId, "comment", `New comment on "${o.title}"`);
    }
    await audit(tx, {
      userId: authorId, action: "comment.add", entityType: "opportunity", entityId: opportunityId,
      summary: `Commented on ${opportunityRef(o.number)}${mentioned.length ? ` mentioning ${mentioned.length} user(s)` : ""}`,
      details: { body: plainText(body) },
    });
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
    const o = await tx.opportunity.update({
      where: { id: comment.opportunityId },
      data: { lastModifiedAt: new Date(), lastModifiedById: userId },
    });
    await audit(tx, { userId, action: "comment.delete", entityType: "opportunity", entityId: o.id, summary: `Deleted a comment on ${opportunityRef(o.number)}`, details: { body: comment.body } });
    return deleted;
  });
}

export async function listComments(opportunityId: string) {
  return db.comment.findMany({ where: { opportunityId, deletedAt: null }, include: { author: true }, orderBy: { createdAt: "asc" } });
}
