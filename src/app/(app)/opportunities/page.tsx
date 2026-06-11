import Link from "next/link";
import { listOpportunities } from "@/services/opportunity-service";
import { OpportunityTable } from "@/components/opportunities/OpportunityTable";
import { KanbanBoard } from "@/components/opportunities/KanbanBoard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { StatStrip } from "@/components/ui/StatStrip";
import { Icon } from "@/components/ui/Icon";
import { grossProfit } from "@/lib/domain/finance";
import { money } from "@/lib/format";
import { parseSort, sortOpportunities } from "@/lib/opportunity-sort";

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<{ view?: string; sort?: string; dir?: string }> }) {
  const { view, sort: sortParam, dir: dirParam } = await searchParams;
  const rows = await listOpportunities();
  const isKanban = view === "kanban";
  const { sort, dir } = parseSort(sortParam, dirParam);
  const sorted = sortOpportunities(rows, sort, dir);

  const active = rows.filter((r) => !r.isCancelled);
  const totalRevenue = active.reduce((s, r) => s + Number(r.revenue), 0);
  const totalGP = active.reduce((s, r) => s + grossProfit(Number(r.revenue), Number(r.marginPct)), 0);

  const stats = [
    { label: "Open opportunities", value: String(active.length), icon: "trending_up", tint: "text-gblue" },
    { label: "Predicted revenue", value: money(totalRevenue), icon: "payments", tint: "text-ggreen" },
    { label: "Predicted gross profit", value: money(totalGP), icon: "savings", tint: "text-[#a36200]" },
  ];

  return (
    <div className="space-y-5">
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

      <StatStrip stats={stats} />

      {isKanban ? (
        <KanbanBoard rows={rows} />
      ) : (
        <Card className="overflow-hidden p-0">
          <OpportunityTable rows={sorted} sort={sort} dir={dir} />
        </Card>
      )}
    </div>
  );
}
