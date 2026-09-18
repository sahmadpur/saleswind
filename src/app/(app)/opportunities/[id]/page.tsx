import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getOpportunity } from "@/services/opportunity-service";
import { updateOpportunityAction } from "@/actions/opportunity-actions";
import { canAdvance, canMoveBack } from "@/lib/domain/lifecycle";
import { StageStepper } from "@/components/opportunities/StageStepper";
import { TransitionControls } from "@/components/opportunities/TransitionControls";
import { OpportunityEditForm } from "@/components/opportunities/OpportunityEditForm";
import { TagPicker } from "@/components/opportunities/TagPicker";
import { CommentThread } from "@/components/comments/CommentThread";
import { ActivityLogView } from "@/components/activity/ActivityLogView";
import { QuickAddTask } from "@/components/tasks/QuickAddTask";
import { TaskList } from "@/components/tasks/TaskList";
import { listOpportunityTasks } from "@/services/task-service";
import { toTaskItems } from "@/lib/task-view";
import { getConnection, listOpportunityMeetings, outlookConfigured } from "@/services/outlook-service";
import { MeetingDialogButton } from "@/components/meetings/MeetingDialog";
import { newMeetingDraft } from "@/lib/meeting-view";
import { Card, CardLabel } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { StatusPill } from "@/components/ui/StatusPill";
import { Avatar } from "@/components/ui/Avatar";
import { grossProfit } from "@/lib/domain/finance";
import { money, opportunityRef, dateTime, shortDate, timeOfDay } from "@/lib/format";

export default async function OpportunityDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const o = await getOpportunity(id);
  if (!o) notFound();

  const [statuses, tags, users, allStatuses, tasks] = await Promise.all([
    db.status.findMany({ where: { stage: o.stage, isActive: true }, orderBy: { label: "asc" } }),
    db.tag.findMany({ where: { stage: o.stage, isActive: true }, orderBy: { label: "asc" } }),
    db.user.findMany({ orderBy: { name: "asc" } }),
    db.status.findMany({ select: { id: true, label: true } }),
    listOpportunityTasks(id),
  ]);
  const meetingsOn = outlookConfigured();
  const [meetings, connection] = meetingsOn ? await Promise.all([listOpportunityMeetings(id), getConnection(user.id)]) : [[], null];
  const openTasks = tasks.filter((t) => t.status === "TODO" || t.status === "IN_PROGRESS").length;
  const labels = Object.fromEntries([...allStatuses.map((s) => [s.id, s.label]), ...users.map((u) => [u.id, u.name])]);
  const attached = new Set(o.tags.map((t) => t.tag.id));
  // Blocked users stay in labels (history) but can't be newly picked, except the current accountable.
  const activeUsers = users.filter((u) => !u.blockedAt);
  const accountableOptions = users.filter((u) => !u.blockedAt || u.id === o.accountableId);
  const bind = updateOpportunityAction.bind(null, id);
  const gp = grossProfit(Number(o.revenue), Number(o.marginPct));

  return (
    <div className="space-y-6">
      <Link href="/opportunities" className="inline-flex items-center gap-1 text-sm text-ggrey transition-colors hover:text-gblue">
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
        Opportunities
      </Link>

      {/* Hero */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <span className="block text-sm tabular-nums text-ggrey">{opportunityRef(o.number)}</span>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold leading-tight tracking-[-0.015em] text-gink">{o.title}</h1>
            <Pill stage={o.stage} />
            {o.status && <StatusPill label={o.status.label} color={o.status.color} />}
          </div>
          <div className="flex items-center gap-2 text-sm text-ggrey">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>domain</span>
            {o.account.name}
            <span className="text-gline">·</span>
            <Avatar name={o.accountable.name} size={20} />
            {o.accountable.name}
          </div>
        </div>
        <div className="flex gap-6 rounded-lg border border-gline-2 bg-gsurface px-5 py-3">
          <div>
            <div className="text-xs text-ggrey">PR</div>
            <div className="text-lg font-semibold tabular-nums text-gink">{money(Number(o.revenue))}</div>
          </div>
          <div className="border-l border-gline-2 pl-6">
            <div className="text-xs text-ggrey">PGP</div>
            <div className="text-lg font-semibold tabular-nums text-ggreen">{money(gp)}</div>
          </div>
        </div>
      </div>

      <Card className="space-y-5">
        <StageStepper stage={o.stage} />
        <div className="border-t border-gline-2 pt-4">
          <TransitionControls id={o.id} canAdvance={canAdvance(o.stage)} canBack={canMoveBack(o.stage)} />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardLabel>Details</CardLabel>
          <OpportunityEditForm
            action={bind}
            defaults={{
              title: o.title, description: o.description ?? "", accountableId: o.accountableId, statusId: o.statusId ?? "",
              revenue: Number(o.revenue), marginPct: Number(o.marginPct),
            }}
            statuses={statuses.map((s) => ({ id: s.id, label: s.label }))}
            users={accountableOptions.map((u) => ({ id: u.id, label: u.name }))}
          />
        </Card>
        <Card>
          <CardLabel>Tags</CardLabel>
          <TagPicker opportunityId={o.id} allTags={tags.map((t) => ({ id: t.id, label: t.label }))} attachedIds={[...attached]} />
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <h2 className="flex items-center gap-2 px-6 pt-5 text-sm font-medium text-gink">
          <span className="material-symbols-outlined text-ggrey" style={{ fontSize: 20 }}>task_alt</span>
          Tasks
          {openTasks > 0 && (
            <span className="rounded-full bg-ghover px-2 py-0.5 text-xs font-medium text-ggrey">{openTasks} open</span>
          )}
        </h2>
        <div className="px-6 pb-4 pt-3">
          <QuickAddTask opportunityId={o.id} currentUserId={user.id} users={activeUsers.map((u) => ({ id: u.id, label: u.name }))} />
        </div>
        {tasks.length > 0 && (
          <div className="border-t border-gline-2 [&_li]:px-6">
            <TaskList tasks={toTaskItems(tasks, user, { showAssignee: true, showOpportunity: false })} empty="" />
          </div>
        )}
      </Card>

      {meetingsOn && (
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between gap-3 px-6 pt-5">
            <h2 className="flex items-center gap-2 text-sm font-medium text-gink">
              <span className="material-symbols-outlined text-ggrey" style={{ fontSize: 20 }}>event</span>
              Meetings
            </h2>
            {connection ? (
              <MeetingDialogButton
                draft={newMeetingDraft(o.id)}
                opportunities={[{ id: o.id, label: `${opportunityRef(o.number)} ${o.title}` }]}
                label="Schedule"
                variant="outline"
              />
            ) : (
              <Link href="/meetings" className="text-xs text-gblue hover:underline">Connect Outlook to schedule</Link>
            )}
          </div>
          {meetings.length === 0 ? (
            <p className="px-6 pb-5 pt-3 text-sm text-ggrey">No meetings linked yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-gline-2 border-t border-gline-2">
              {meetings.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 py-3 text-sm">
                  <span className="w-40 shrink-0 tabular-nums text-gink-2">{shortDate(m.start)} {m.isAllDay ? "" : timeOfDay(m.start)}</span>
                  <span className="min-w-0 flex-1 font-medium text-gink">{m.subject}</span>
                  <span className="text-xs text-ggrey">{m.user.name}</span>
                  {m.joinUrl && m.end > new Date() && (
                    <a href={m.joinUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-gviolet hover:underline">Join</a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card>
        <CommentThread
          opportunityId={o.id}
          comments={o.comments.map((c) => ({ id: c.id, body: c.body, author: c.author.name, authorId: c.authorId, when: dateTime(c.createdAt) }))}
          currentUserId={user.id}
          isElevated={user.role === "ADMIN" || user.role === "MANAGER"}
          users={activeUsers.map((u) => ({ id: u.id, name: u.name }))}
        />
      </Card>
      <Card>
        <ActivityLogView entries={o.activities} labels={labels} />
      </Card>
    </div>
  );
}
