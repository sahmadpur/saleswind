import "server-only";
import { db } from "@/lib/db";
import { audit } from "@/services/audit-service";
import { notify } from "@/services/notification-service";
import type { TaskCreateInput } from "@/schemas/task";

const include = {
  assignee: { select: { id: true, name: true } },
  opportunity: { select: { id: true, number: true, title: true } },
} as const;

export async function createTask(input: TaskCreateInput, userId: string) {
  return db.$transaction(async (tx) => {
    const t = await tx.task.create({
      data: {
        title: input.title,
        dueDate: input.dueDate ? new Date(`${input.dueDate}T00:00:00Z`) : null,
        assigneeId: input.assigneeId || userId,
        opportunityId: input.opportunityId || null,
        createdById: userId,
      },
      include,
    });
    await audit(tx, { userId, action: "task.create", entityType: t.opportunityId ? "opportunity" : "task", entityId: t.opportunityId ?? t.id, summary: `Created task "${t.title}" for ${t.assignee.name}` });
    if (t.assigneeId !== userId) {
      const author = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
      await notify(tx, t.assigneeId, t.opportunityId, "task", `${author.name} assigned you a task: "${t.title}"`);
    }
    return t;
  });
}

/** Only the assignee, the creator or a manager/admin may change a task. */
async function loadEditable(id: string, userId: string, elevated: boolean) {
  const t = await db.task.findUniqueOrThrow({ where: { id } });
  if (!elevated && t.assigneeId !== userId && t.createdById !== userId) throw new Error("Forbidden");
  return t;
}

export async function setTaskDone(id: string, done: boolean, userId: string, elevated: boolean) {
  await loadEditable(id, userId, elevated);
  return db.$transaction(async (tx) => {
    const t = await tx.task.update({ where: { id }, data: { doneAt: done ? new Date() : null } });
    await audit(tx, { userId, action: done ? "task.done" : "task.reopen", entityType: t.opportunityId ? "opportunity" : "task", entityId: t.opportunityId ?? t.id, summary: `${done ? "Completed" : "Reopened"} task "${t.title}"` });
    return t;
  });
}

export async function deleteTask(id: string, userId: string, elevated: boolean) {
  await loadEditable(id, userId, elevated);
  return db.$transaction(async (tx) => {
    const t = await tx.task.delete({ where: { id } });
    await audit(tx, { userId, action: "task.delete", entityType: t.opportunityId ? "opportunity" : "task", entityId: t.opportunityId ?? t.id, summary: `Deleted task "${t.title}"` });
    return t;
  });
}

export type TaskScope = "open" | "done";

export async function listMyTasks(userId: string, scope: TaskScope) {
  return db.task.findMany({
    where: { assigneeId: userId, doneAt: scope === "open" ? null : { not: null } },
    // Open: soonest due first, undated last. Done: most recently completed first.
    orderBy: scope === "open" ? [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }] : [{ doneAt: "desc" }],
    take: scope === "done" ? 100 : undefined,
    include,
  });
}

export async function listOpportunityTasks(opportunityId: string) {
  return db.task.findMany({
    where: { opportunityId },
    orderBy: [{ doneAt: { sort: "desc", nulls: "first" } }, { dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    include,
  });
}

export const countOpenTasks = (userId: string) => db.task.count({ where: { assigneeId: userId, doneAt: null } });
