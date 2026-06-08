import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getOpportunity } from "@/services/opportunity-service";
import { updateOpportunityAction } from "@/actions/opportunity-actions";
import { canAdvance, canMoveBack } from "@/lib/domain/lifecycle";
import { StateStepper } from "@/components/opportunities/StateStepper";
import { TransitionControls } from "@/components/opportunities/TransitionControls";
import { OpportunityEditForm } from "@/components/opportunities/OpportunityEditForm";
import { TagPicker } from "@/components/opportunities/TagPicker";
import { CommentThread } from "@/components/comments/CommentThread";
import { ActivityLogView } from "@/components/activity/ActivityLogView";
import { Card, CardLabel } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Avatar } from "@/components/ui/Avatar";
import { grossProfit } from "@/lib/domain/finance";
import { money } from "@/lib/format";

export default async function OpportunityDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const o = await getOpportunity(id);
  if (!o) notFound();

  const [statuses, tags, users] = await Promise.all([
    db.status.findMany({ where: { state: o.state, isActive: true }, orderBy: { label: "asc" } }),
    db.tag.findMany({ where: { state: o.state, isActive: true }, orderBy: { label: "asc" } }),
    db.user.findMany({ orderBy: { name: "asc" } }),
  ]);
  const attached = new Set(o.tags.map((t) => t.tag.id));
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
          <div className="flex items-center gap-3">
            <h1 className="text-[1.75rem] font-normal leading-tight tracking-[-0.01em] text-gink">{o.title}</h1>
            <Pill state={o.isCancelled ? "CANCELLED" : o.state} />
          </div>
          <div className="flex items-center gap-2 text-sm text-ggrey">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>domain</span>
            {o.account.name}
            <span className="text-gline">·</span>
            <Avatar name={o.owner.name} size={20} />
            {o.owner.name}
          </div>
        </div>
        <div className="flex gap-6 rounded-2xl border border-gline-2 bg-gsurface px-6 py-3">
          <div>
            <div className="text-xs text-ggrey">Revenue</div>
            <div className="text-lg font-medium tabular-nums text-gink">{money(Number(o.revenue))}</div>
          </div>
          <div className="border-l border-gline-2 pl-6">
            <div className="text-xs text-ggrey">Gross profit</div>
            <div className="text-lg font-medium tabular-nums text-ggreen">{money(gp)}</div>
          </div>
        </div>
      </div>

      <Card className="space-y-5">
        <StateStepper state={o.state} cancelled={o.isCancelled} />
        <div className="border-t border-gline-2 pt-4">
          <TransitionControls id={o.id} canAdvance={canAdvance(o.state)} canBack={canMoveBack(o.state)} cancelled={o.isCancelled} />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardLabel>Details</CardLabel>
          <OpportunityEditForm
            action={bind}
            defaults={{
              title: o.title, description: o.description ?? "", ownerId: o.ownerId, statusId: o.statusId ?? "",
              revenue: Number(o.revenue), marginPct: Number(o.marginPct),
              meetingAt: o.meetingAt ? o.meetingAt.toISOString().slice(0, 16) : "",
            }}
            statuses={statuses.map((s) => ({ id: s.id, label: s.label }))}
            users={users.map((u) => ({ id: u.id, label: u.name }))}
          />
        </Card>
        <Card>
          <CardLabel>Tags</CardLabel>
          <TagPicker opportunityId={o.id} allTags={tags.map((t) => ({ id: t.id, label: t.label }))} attachedIds={[...attached]} />
        </Card>
      </div>

      <Card>
        <CommentThread
          opportunityId={o.id}
          comments={o.comments.map((c) => ({ id: c.id, body: c.body, author: c.author.name, authorId: c.authorId, createdAt: c.createdAt }))}
          currentUserId={user.id}
          isElevated={user.role === "ADMIN" || user.role === "MANAGER"}
        />
      </Card>
      <Card>
        <ActivityLogView entries={o.activities} />
      </Card>
    </div>
  );
}
