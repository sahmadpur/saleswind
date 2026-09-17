import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { listMyTasks, type TaskScope } from "@/services/task-service";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { QuickAddTask } from "@/components/tasks/QuickAddTask";
import { TaskList } from "@/components/tasks/TaskList";
import { opportunityRef } from "@/lib/format";
import { toTaskItems } from "@/lib/task-view";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const user = await requireUser();
  const scope: TaskScope = (await searchParams).show === "done" ? "done" : "open";
  const [tasks, users, opportunities, openCount] = await Promise.all([
    listMyTasks(user.id, scope),
    db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.opportunity.findMany({ where: { isCancelled: false }, select: { id: true, number: true, title: true }, orderBy: { number: "desc" } }),
    db.task.count({ where: { assigneeId: user.id, doneAt: null } }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        title="My tasks"
        actions={
          <Segmented
            segments={[
              { label: `Open${openCount ? ` (${openCount})` : ""}`, href: "/tasks", icon: "radio_button_unchecked", active: scope === "open" },
              { label: "Done", href: "/tasks?show=done", icon: "task_alt", active: scope === "done" },
            ]}
          />
        }
      />
      <Card className="p-4">
        <QuickAddTask
          currentUserId={user.id}
          users={users.map((u) => ({ id: u.id, label: u.name }))}
          opportunities={opportunities.map((o) => ({ id: o.id, label: `${opportunityRef(o.number)} ${o.title}` }))}
        />
      </Card>
      <Card className="overflow-hidden p-0">
        <TaskList
          tasks={toTaskItems(tasks, user, { showAssignee: false, showOpportunity: true })}
          empty={scope === "open" ? "Nothing to do — add a task above." : "No completed tasks yet."}
        />
      </Card>
    </div>
  );
}
