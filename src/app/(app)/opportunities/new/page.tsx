import { db } from "@/lib/db";
import { createOpportunityAction } from "@/actions/opportunity-actions";
import { OpportunityCreateForm } from "@/components/opportunities/OpportunityCreateForm";
import { Card } from "@/components/ui/Card";

export default async function NewOpportunityPage() {
  const [accounts, users] = await Promise.all([
    db.account.findMany({ orderBy: { name: "asc" } }),
    db.user.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-medium">New opportunity</h1>
      <Card>
        <OpportunityCreateForm
          action={createOpportunityAction}
          accounts={accounts.map((a) => ({ id: a.id, label: a.name }))}
          users={users.map((u) => ({ id: u.id, label: u.name }))}
        />
      </Card>
    </div>
  );
}
