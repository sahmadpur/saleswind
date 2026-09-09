import Link from "next/link";
import { db } from "@/lib/db";
import { createOpportunityAction } from "@/actions/opportunity-actions";
import { OpportunityCreateForm } from "@/components/opportunities/OpportunityCreateForm";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function NewOpportunityPage() {
  const [accounts, users] = await Promise.all([
    db.account.findMany({ orderBy: { name: "asc" } }),
    db.user.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/opportunities" className="inline-flex items-center gap-1 text-sm text-ggrey transition-colors hover:text-gblue">
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
        Opportunities
      </Link>
      <PageHeader title="New opportunity" />
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
