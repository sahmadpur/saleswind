import Link from "next/link";
import { listOpportunities } from "@/services/opportunity-service";
import { OpportunityTable } from "@/components/opportunities/OpportunityTable";
import { KanbanBoard } from "@/components/opportunities/KanbanBoard";
import { FilterBar } from "@/components/opportunities/FilterBar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { Icon } from "@/components/ui/Icon";
import { ORDER } from "@/lib/domain/lifecycle";
import { filterOpportunities, parseFilters, parseSort, sortOpportunities } from "@/lib/opportunity-sort";

const distinct = (xs: (string | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x))].sort();

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const rows = await listOpportunities();
  const isKanban = params.view === "kanban";
  const { sort, dir } = parseSort(params.sort, params.dir);
  const filters = parseFilters(params);
  const sorted = sortOpportunities(filterOpportunities(rows, filters), sort, dir);
  // Current query minus `view`, so sort links and filter changes preserve each other.
  const query = { sort, dir, ...filters };
  const options = {
    state: [...ORDER, "CANCELLED"],
    status: distinct(rows.map((r) => r.status?.label)),
    accountable: distinct(rows.map((r) => r.accountable.name)),
    account: distinct(rows.map((r) => r.account.name)),
  };

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
        <>
          <FilterBar filters={filters} options={options} query={{ ...query, view: "table" }} />
          <Card className="overflow-hidden p-0">
            <OpportunityTable rows={sorted} sort={sort} dir={dir} query={query} filtered={Object.keys(filters).length > 0} />
          </Card>
        </>
      )}
    </div>
  );
}
