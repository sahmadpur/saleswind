import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { BOARD_FINISHED_DAYS, countOpenTasks, listMyTasks, type TaskScope } from "@/services/task-service";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { QuickAddTask } from "@/components/tasks/QuickAddTask";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { opportunityRef } from "@/lib/format";
import { toTaskItems } from "@/lib/task-view";

const LIST_TABS = [
  { show: "open", label: "Open", empty: "Nothing to do — add a task above." },
  { show: "done", label: "Done", empty: "No completed tasks yet." },
  { show: "cancelled", label: "Cancelled", empty: "No cancelled tasks." },
] as const;

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ view?: string; show?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const isList = params.view === "list";
  const tab = LIST_TABS.find((t) => t.show === params.show) ?? LIST_TABS[0];
  const scope: TaskScope = isList ? tab.show : "board";

  const [tasks, users, opportunities, openCount] = await Promise.all([
    listMyTasks(user.id, scope),
    db.user.findMany({ where: { blockedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.opportunity.findMany({ where: { NOT: { status: { is: { label: "Cancelled" } } } }, select: { id: true, number: true, title: true }, orderBy: { number: "desc" } }),
    countOpenTasks(user.id),
  ]);
  const items = toTaskItems(tasks, user, { showAssignee: false, showOpportunity: true });

  return (
    <div className="space-y-5">
      <PageHeader
        title="My tasks"
        actions={
          <Segmented
            segments={[
              { label: "Board", href: "/tasks", icon: "view_kanban", active: !isList },
              { label: "List", href: "/tasks?view=list", icon: "checklist", active: isList },
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

      {isList ? (
        <div className="mx-auto max-w-4xl space-y-3">
          <Segmented
            segments={LIST_TABS.map((t) => ({
              label: t.show === "open" && openCount ? `${t.label} (${openCount})` : t.label,
              href: `/tasks?view=list${t.show === "open" ? "" : `&show=${t.show}`}`,
              active: t.show === tab.show,
            }))}
          />
          <Card className="overflow-hidden p-0">
            <TaskList tasks={items} empty={tab.empty} />
          </Card>
        </div>
      ) : (
        <>
          <TaskBoard tasks={items} />
          <p className="text-xs text-ggrey-2">Done and cancelled tasks leave the board after {BOARD_FINISHED_DAYS} days; find them in List view.</p>
        </>
      )}
    </div>
  );
}
