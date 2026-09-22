import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { BOARD_FINISHED_DAYS, countOpenTasks, listTasks, type TaskScope } from "@/services/task-service";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { QuickAddTask } from "@/components/tasks/QuickAddTask";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { AssigneeFilter } from "@/components/tasks/AssigneeFilter";
import { opportunityRef } from "@/lib/format";
import { toTaskItems } from "@/lib/task-view";

const LIST_TABS = [
  { show: "open", label: "Open", empty: "Nothing to do — add a task above." },
  { show: "done", label: "Done", empty: "No completed tasks yet." },
  { show: "cancelled", label: "Cancelled", empty: "No cancelled tasks." },
] as const;

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ view?: string; show?: string; who?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const isList = params.view === "list";
  const tab = LIST_TABS.find((t) => t.show === params.show) ?? LIST_TABS[0];
  const scope: TaskScope = isList ? tab.show : "board";

  // Everyone sees the whole team's tasks by default; `who` narrows to me or one teammate.
  const users = await db.user.findMany({ where: { blockedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const who = params.who === "me" || users.some((u) => u.id === params.who) ? params.who! : "all";
  const assigneeId = who === "all" ? null : who === "me" ? user.id : who;
  const [tasks, opportunities, openCount] = await Promise.all([
    listTasks(scope, assigneeId),
    db.opportunity.findMany({ where: { NOT: { status: { is: { label: "Cancelled" } } } }, select: { id: true, number: true, title: true }, orderBy: { number: "desc" } }),
    countOpenTasks(assigneeId),
  ]);
  const items = toTaskItems(tasks, user, { showAssignee: assigneeId !== user.id, showOpportunity: true });
  const userOptions = users.map((u) => ({ id: u.id, label: u.name }));
  const opportunityOptions = opportunities.map((o) => ({ id: o.id, label: `${opportunityRef(o.number)} ${o.title}` }));
  const edit = { users: userOptions, opportunities: opportunityOptions };
  const whoQuery = who === "all" ? "" : `who=${encodeURIComponent(who)}`;
  const withWho = (base: string) => (whoQuery ? `${base}${base.includes("?") ? "&" : "?"}${whoQuery}` : base);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tasks"
        actions={
          <>
            <AssigneeFilter
              value={who}
              users={users.filter((u) => u.id !== user.id).map((u) => ({ id: u.id, label: u.name }))}
              baseQuery={{ ...(isList && { view: "list" }), ...(isList && tab.show !== "open" && { show: tab.show }) }}
            />
            <Segmented
              segments={[
                { label: "Board", href: withWho("/tasks"), icon: "view_kanban", active: !isList },
                { label: "List", href: withWho("/tasks?view=list"), icon: "checklist", active: isList },
              ]}
            />
          </>
        }
      />
      <Card className="p-4">
        <QuickAddTask
          currentUserId={user.id}
          users={userOptions}
          opportunities={opportunityOptions}
        />
      </Card>

      {isList ? (
        <div className="mx-auto max-w-4xl space-y-3">
          <Segmented
            segments={LIST_TABS.map((t) => ({
              label: t.show === "open" && openCount ? `${t.label} (${openCount})` : t.label,
              href: withWho(`/tasks?view=list${t.show === "open" ? "" : `&show=${t.show}`}`),
              active: t.show === tab.show,
            }))}
          />
          <Card className="overflow-hidden p-0">
            <TaskList tasks={items} empty={tab.empty} edit={edit} />
          </Card>
        </div>
      ) : (
        <>
          <TaskBoard tasks={items} edit={edit} />
          <p className="text-xs text-ggrey-2">Done and cancelled tasks leave the board after {BOARD_FINISHED_DAYS} days; find them in List view.</p>
        </>
      )}
    </div>
  );
}
