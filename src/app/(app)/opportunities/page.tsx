import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { can } from "@/lib/domain/permissions";
import { listOpportunities } from "@/services/opportunity-service";
import { OpportunityTable, type EditOptions } from "@/components/opportunities/OpportunityTable";
import { KanbanBoard } from "@/components/opportunities/KanbanBoard";
import { FilterBar } from "@/components/opportunities/FilterBar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { Icon } from "@/components/ui/Icon";
import { Pagination } from "@/components/ui/Pagination";
import { ORDER } from "@/lib/domain/lifecycle";
import { PAGE_SIZES, paginate, parsePage } from "@/lib/pagination";
import { filterOpportunities, parseFilters, parseSort, sortOpportunities } from "@/lib/opportunity-sort";

const distinct = (xs: (string | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x))].sort();

const EXPORT_LINK =
  "g-press inline-flex h-9 items-center gap-1.5 rounded-md border border-gline bg-gsurface px-3 text-sm font-medium text-gink transition-colors hover:bg-ghover [&_.material-symbols-outlined]:text-[18px]";

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const [rows, user] = await Promise.all([listOpportunities(), getCurrentUser()]);
  const isKanban = params.view === "kanban";
  const { sort, dir } = parseSort(params.sort, params.dir);
  const filters = parseFilters(params);
  const { page: requestedPage, size } = parsePage(params);
  const sorted = sortOpportunities(filterOpportunities(rows, filters), sort, dir);
  const { rows: pageRows, page } = paginate(sorted, requestedPage, size);
  // Current query minus `view` and `page`, so sort links and filter changes preserve each other and restart at page 1.
  const query: Record<string, string> = { sort, dir, ...filters, ...(size !== PAGE_SIZES[0] && { size: String(size) }) };
  const options = {
    stage: [...ORDER, "CANCELLED"],
    status: distinct(rows.map((r) => r.status?.label)),
    accountable: distinct(rows.map((r) => r.accountable.name)),
    account: distinct(rows.map((r) => r.account.name)),
  };

  let edit: EditOptions | null = null;
  if (!isKanban && user && can(user.role, "opportunity:write")) {
    const [users, statuses] = await Promise.all([
      db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      db.status.findMany({ orderBy: { label: "asc" } }),
    ]);
    const inUse = new Set(pageRows.map((r) => r.statusId));
    const statusesByStage: EditOptions["statusesByStage"] = {};
    // Inactive statuses stay selectable only where a row still uses them.
    for (const s of statuses) if (s.isActive || inUse.has(s.id)) (statusesByStage[s.stage] ??= []).push({ value: s.id, label: s.label });
    edit = { users: users.map((u) => ({ value: u.id, label: u.name })), statusesByStage };
  }
  const exportQuery = new URLSearchParams({ sort, dir, ...filters });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Opportunities"
        actions={
          <>
            {!isKanban && (
              <>
                <a href={`/opportunities/export?format=xlsx&${exportQuery}`} className={EXPORT_LINK}>
                  <Icon name="table_view" />
                  Excel
                </a>
                <a href={`/opportunities/export?format=pdf&${exportQuery}`} className={EXPORT_LINK}>
                  <Icon name="picture_as_pdf" />
                  PDF
                </a>
              </>
            )}
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
            <OpportunityTable
              rows={pageRows}
              sort={sort}
              dir={dir}
              query={query}
              filtered={Object.keys(filters).length > 0}
              edit={edit}
              footer={
                <Pagination pathname="/opportunities" query={{ ...query, view: "table" }} page={page} size={size} total={sorted.length} sizes={PAGE_SIZES} />
              }
            />
          </Card>
        </>
      )}
    </div>
  );
}
