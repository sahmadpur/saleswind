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
import { Card } from "@/components/ui/Card";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium">{o.title}</h1>
        <p className="text-sm text-neutral-500">{o.account.name} · Owner {o.owner.name}</p>
      </div>
      <Card><StateStepper state={o.state} cancelled={o.isCancelled} /></Card>
      <Card>
        <TransitionControls id={o.id} canAdvance={canAdvance(o.state)} canBack={canMoveBack(o.state)} cancelled={o.isCancelled} />
      </Card>
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <h2 className="mb-4 text-sm font-medium text-neutral-500">Details</h2>
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
          <h2 className="mb-4 text-sm font-medium text-neutral-500">Tags</h2>
          <TagPicker opportunityId={o.id} allTags={tags.map((t) => ({ id: t.id, label: t.label }))} attachedIds={[...attached]} />
        </Card>
      </div>
      <Card><CommentThread opportunityId={o.id} comments={o.comments.map((c) => ({ id: c.id, body: c.body, author: c.author.name, authorId: c.authorId, createdAt: c.createdAt }))} currentUserId={user.id} isElevated={user.role === "ADMIN" || user.role === "MANAGER"} /></Card>
      <Card><ActivityLogView entries={o.activities} /></Card>
    </div>
  );
}
