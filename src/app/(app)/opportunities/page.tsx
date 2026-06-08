import Link from "next/link";
import { listOpportunities } from "@/services/opportunity-service";
import { OpportunityTable } from "@/components/opportunities/OpportunityTable";
import { KanbanBoard } from "@/components/opportunities/KanbanBoard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { Icon } from "@/components/ui/Icon";
import { grossProfit } from "@/lib/domain/finance";
import { money } from "@/lib/format";

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const rows = await listOpportunities();
  const isKanban = view === "kanban";

  const active = rows.filter((r) => !r.isCancelled);
  const totalRevenue = active.reduce((s, r) => s + Number(r.revenue), 0);
  const totalGP = active.reduce((s, r) => s + grossProfit(Number(r.revenue), Number(r.marginPct)), 0);

  const stats = [
    { label: "Open opportunities", value: String(active.length), icon: "trending_up", tint: "text-gblue", bg: "bg-gblue-100" },
    { label: "Pipeline revenue", value: money(totalRevenue), icon: "payments", tint: "text-ggreen", bg: "bg-ggreen-50" },
    { label: "Projected gross profit", value: money(totalGP), icon: "savings", tint: "text-[#a36200]", bg: "bg-gyellow-50" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Opportunities"
        subtitle="Track every deal across your sales pipeline"
        actions={
          <>
            <Segmented
              segments={[
                { label: "Table", href: "/opportunities?view=table", icon: "table_rows", active: !isKanban },
                { label: "Board", href: "/opportunities?view=kanban", icon: "view_kanban", active: isKanban },
              ]}
            />
            <Link href="/opportunities/new">
              <Button>
                <Icon name="add" />
                New opportunity
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="g-rise flex items-center gap-4 p-5">
            <span className={`grid h-11 w-11 place-items-center rounded-full ${s.bg} ${s.tint}`}>
              <Icon name={s.icon} filled />
            </span>
            <div className="min-w-0">
              <div className="truncate text-2xl font-normal text-gink">{s.value}</div>
              <div className="text-xs text-ggrey">{s.label}</div>
            </div>
          </Card>
        ))}
      </div>

      {isKanban ? (
        <KanbanBoard rows={rows} />
      ) : (
        <Card className="overflow-hidden p-0">
          <OpportunityTable rows={rows} />
        </Card>
      )}
    </div>
  );
}
