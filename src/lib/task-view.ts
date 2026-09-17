import type { SessionUser } from "@/lib/session";
import { dateOnly, opportunityRef, shortName, todayIso } from "@/lib/format";
import type { TaskItem } from "@/components/tasks/TaskList";
import type { TaskStatusValue } from "@/lib/task-status";

type TaskRow = {
  id: string; title: string; status: TaskStatusValue; dueDate: Date | null; doneAt: Date | null; assigneeId: string; createdById: string;
  assignee: { name: string }; opportunity: { id: string; number: number; title: string } | null;
};

/** Server-side shaping of tasks for the client list (dates pre-formatted in the app zone). */
export function toTaskItems(rows: TaskRow[], user: SessionUser, opts: { showAssignee: boolean; showOpportunity: boolean }): TaskItem[] {
  const today = todayIso();
  const elevated = user.role === "ADMIN" || user.role === "MANAGER";
  return rows.map((t) => {
    const dueIso = t.dueDate?.toISOString().slice(0, 10);
    return {
      id: t.id,
      title: t.title,
      status: t.status,
      done: t.status === "DONE",
      canEdit: elevated || t.assigneeId === user.id || t.createdById === user.id,
      due: t.dueDate ? dateOnly(t.dueDate) : null,
      dueState: !dueIso ? null : dueIso < today ? "overdue" : dueIso === today ? "today" : null,
      assignee: opts.showAssignee ? shortName(t.assignee.name) : null,
      opportunity: opts.showOpportunity && t.opportunity
        ? { href: `/opportunities/${t.opportunity.id}`, label: `${opportunityRef(t.opportunity.number)} ${t.opportunity.title}` }
        : null,
    };
  });
}
