import "server-only";
import type { Prisma, TaskStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { TASK_STATUS } from "@/lib/task-status";
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

/** Move a task to a status. `doneAt` records when it was completed and is cleared otherwise. */
export async function setTaskStatus(id: string, status: TaskStatus, userId: string, elevated: boolean) {
  const before = await loadEditable(id, userId, elevated);
  if (before.status === status) return before;
  return db.$transaction(async (tx) => {
    const t = await tx.task.update({ where: { id }, data: { status, doneAt: status === "DONE" ? new Date() : null } });
    await audit(tx, {
      userId, action: "task.status", entityType: t.opportunityId ? "opportunity" : "task", entityId: t.opportunityId ?? t.id,
      summary: `Moved task "${t.title}" from ${TASK_STATUS[before.status].label} to ${TASK_STATUS[status].label}`,
    });
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

export type TaskScope = "board" | "open" | "done" | "cancelled";

/** Board keeps finished columns short: done/cancelled tasks drop off after this many days. */
export const BOARD_FINISHED_DAYS = 30;

/** Tasks for one assignee, or the whole team when `assigneeId` is null. */
export async function listTasks(scope: TaskScope, assigneeId: string | null) {
  const since = new Date(Date.now() - BOARD_FINISHED_DAYS * 86_400_000);
  const who: Prisma.TaskWhereInput = assigneeId ? { assigneeId } : {};
  const where: Prisma.TaskWhereInput =
    scope === "board"
      ? { ...who, OR: [{ status: { in: ["TODO", "IN_PROGRESS"] } }, { status: { in: ["DONE", "CANCELLED"] }, updatedAt: { gte: since } }] }
      : { ...who, status: scope === "open" ? { in: ["TODO", "IN_PROGRESS"] } : scope === "done" ? "DONE" : "CANCELLED" };
  return db.task.findMany({
    where,
    // Open work: soonest due first, undated last. Finished: most recent first.
    orderBy: scope === "done" ? [{ doneAt: "desc" }] : scope === "cancelled" ? [{ updatedAt: "desc" }] : [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    take: scope === "done" || scope === "cancelled" ? 100 : undefined,
    include,
  });
}

export async function listOpportunityTasks(opportunityId: string) {
  return db.task.findMany({
    where: { opportunityId },
    // Open work first, then finished; within each, soonest due first.
    orderBy: [{ status: "asc" }, { dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    include,
  });
}

export const countOpenTasks = (assigneeId: string | null) =>
  db.task.count({ where: { ...(assigneeId ? { assigneeId } : {}), status: { in: ["TODO", "IN_PROGRESS"] } } });
