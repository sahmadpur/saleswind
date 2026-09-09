import Link from "next/link";
import { listOpportunities } from "@/services/opportunity-service";
import { OpportunityTable } from "@/components/opportunities/OpportunityTable";
import { KanbanBoard } from "@/components/opportunities/KanbanBoard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { Icon } from "@/components/ui/Icon";
import { parseSort, sortOpportunities } from "@/lib/opportunity-sort";

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<{ view?: string; sort?: string; dir?: string }> }) {
  const { view, sort: sortParam, dir: dirParam } = await searchParams;
  const rows = await listOpportunities();
  const isKanban = view === "kanban";
  const { sort, dir } = parseSort(sortParam, dirParam);
  const sorted = sortOpportunities(rows, sort, dir);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Opportunities"
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
