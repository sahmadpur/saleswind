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
import { ResetColumnWidths } from "@/components/ui/ColResizer";
import { ORDER } from "@/lib/domain/lifecycle";
import { PAGE_SIZES, paginate, parsePage } from "@/lib/pagination";
import { filterOpportunities, filtersToQuery, hasActiveFilters, parseFilters, parseSort, sortOpportunities } from "@/lib/opportunity-sort";
import { distinct, param, type QueryParams } from "@/lib/table";
import { shortName } from "@/lib/format";

const asOptions = (values: string[]) => values.map((v) => ({ value: v, label: v }));

const EXPORT_LINK =
  "g-press inline-flex h-9 w-9 items-center justify-center rounded-md border border-gline bg-gsurface text-gink transition-colors hover:bg-ghover [&_.material-symbols-outlined]:text-[18px]";

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<QueryParams> }) {
  const params = await searchParams;
  const [rows, user] = await Promise.all([listOpportunities(), getCurrentUser()]);
  const isKanban = param(params, "view") === "kanban";
  const { sort, dir } = parseSort(param(params, "sort"), param(params, "dir"));
  const filters = parseFilters(params);
  const { page: requestedPage, size } = parsePage({ page: param(params, "page"), size: param(params, "size") });
  const sorted = sortOpportunities(filterOpportunities(rows, filters), sort, dir);
  const { rows: pageRows, page } = paginate(sorted, requestedPage, size);
  // Current query minus `view` and `page`, so sort links and filter changes preserve each other and restart at page 1.
  const query = filtersToQuery(filters, { sort, dir, size: size !== PAGE_SIZES[0] ? String(size) : undefined });
  const options = {
    stage: ORDER.map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() })),
    status: asOptions(distinct(rows.map((r) => r.status?.label))),
    // Filter values are full names (that's what rows carry); labels are shortened to keep the dropdown narrow.
    accountable: distinct(rows.map((r) => r.accountable.name)).map((v) => ({ value: v, label: shortName(v) })),
    account: asOptions(distinct(rows.map((r) => r.account.name))),
  };

  let edit: EditOptions | null = null;
  if (!isKanban && user && can(user.role, "opportunity:write")) {
    const [users, statuses, tags] = await Promise.all([
      db.user.findMany({ select: { id: true, name: true, blockedAt: true }, orderBy: { name: "asc" } }),
      db.status.findMany({ orderBy: { label: "asc" } }),
      db.tag.findMany({ where: { isActive: true }, orderBy: { label: "asc" } }),
    ]);
    const inUse = new Set(pageRows.map((r) => r.statusId));
    const statusesByStage: EditOptions["statusesByStage"] = {};
    // Inactive statuses stay selectable only where a row still uses them.
    for (const s of statuses) if (s.isActive || inUse.has(s.id)) (statusesByStage[s.stage] ??= []).push({ value: s.id, label: s.label });
    // Inactive tags aren't offered; TagCell still shows (and can remove) ones already attached.
    const tagsByStage: EditOptions["tagsByStage"] = {};
    for (const t of tags) (tagsByStage[t.stage] ??= []).push({ value: t.id, label: t.label });
    // Blocked users can't be newly assigned, but stay selectable where already accountable.
    const accountable = new Set(pageRows.map((r) => r.accountableId));
    const assignable = users.filter((u) => !u.blockedAt || accountable.has(u.id));
    edit = { users: assignable.map((u) => ({ value: u.id, label: u.name })), statusesByStage, tagsByStage };
  }
  const exportQuery = filtersToQuery(filters, { sort, dir });

  const tableQuery = new URLSearchParams(query);
  tableQuery.set("view", "table");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Opportunities"
        actions={
          <>
            {!isKanban && (
              <>
                <a href={`/opportunities/export?format=xlsx&${exportQuery}`} className={EXPORT_LINK} title="Export to Excel" aria-label="Export to Excel">
                  <Icon name="table_view" />
                </a>
                <a href={`/opportunities/export?format=pdf&${exportQuery}`} className={EXPORT_LINK} title="Export to PDF" aria-label="Export to PDF">
                  <Icon name="picture_as_pdf" />
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <FilterBar filters={filters} options={options} query={{ sort, dir, view: "table", ...(size !== PAGE_SIZES[0] && { size: String(size) }) }} />
            <ResetColumnWidths scope="opportunities" className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-gblue transition-colors hover:bg-gblue-50 disabled:cursor-default disabled:text-ggrey-2 disabled:hover:bg-transparent" />
          </div>
          <Card className="overflow-hidden p-0">
            <OpportunityTable
              rows={pageRows}
              sort={sort}
              dir={dir}
              query={query}
              filtered={hasActiveFilters(filters)}
              edit={edit}
              footer={
                <Pagination pathname="/opportunities" query={tableQuery} page={page} size={size} total={sorted.length} sizes={PAGE_SIZES} />
              }
            />
          </Card>
        </>
      )}
    </div>
  );
}
