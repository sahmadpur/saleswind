import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { listAudit, type AuditFilters, type AuditSortKey } from "@/services/audit-service";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { SortableTH } from "@/components/ui/SortableTH";
import { ColResizer, RestoreColumnWidths, ResetColumnWidths } from "@/components/ui/ColResizer";
import { TableFilterBar } from "@/components/ui/TableFilterBar";
import { dateTime, shortDate, shortName } from "@/lib/format";
import { PAGE_SIZES, parsePage } from "@/lib/pagination";
import { param, parseMultiFilters, parseSort, type QueryParams, type SortDir } from "@/lib/table";

const SCOPE = "audit";
const TH = "relative px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-gink";
const TD = "px-3 py-2 align-top";
const RESET = "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-gblue transition-colors hover:bg-gblue-50 disabled:cursor-default disabled:text-ggrey-2 disabled:hover:bg-transparent";

const SELECT_KEYS = ["userId", "action", "entityType"] as const;
const SORT_KEYS: AuditSortKey[] = ["time", "user", "action", "entity"];
const DEFAULT_DIR: Record<AuditSortKey, SortDir> = { time: "desc", user: "asc", action: "asc", entity: "asc" };

/** Where an audited entity lives in the app, if it has a page. */
function entityHref(type: string | null, id: string | null): string | null {
  if (!type) return null;
  switch (type) {
    case "opportunity": return id ? `/opportunities/${id}` : null;
    case "account": return id ? `/accounts/${id}` : null;
    case "user": return "/users";
    case "status": case "tag": case "definition": return "/dictionary";
    case "vendor": return id ? `/vendors/${id}` : null;
    case "staff": return id ? `/staff/${id}` : null;
    case "partner": return id ? `/partners/${id}` : null;
    case "task": return "/tasks";
    case "page": return id === "instructions" ? "/instructions" : null;
    default: return null;
  }
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<QueryParams> }) {
  await requireRole("audit:view");
  const params = await searchParams;
  const selects = parseMultiFilters(params, SELECT_KEYS);
  const from = param(params, "from");
  const to = param(params, "to");
  const filters: AuditFilters = { ...selects, from, to };
  const { sort, dir } = parseSort(SORT_KEYS, DEFAULT_DIR, "time", param(params, "sort"), param(params, "dir"));
  const { page, size } = parsePage({ page: param(params, "page"), size: param(params, "size") });

  const [{ rows, total, actions, entityTypes }, users] = await Promise.all([
    listAudit(filters, page, size, sort, dir),
    db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const nameOf = new Map(users.map((u) => [u.id, u.name]));

  const query = new URLSearchParams();
  for (const k of SELECT_KEYS) for (const v of selects[k]) query.append(k, v);
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  query.set("sort", sort);
  query.set("dir", dir);
  if (size !== PAGE_SIZES[0]) query.set("size", String(size));

  const filtered = !!from || !!to || SELECT_KEYS.some((k) => selects[k].length > 0);
  const sortable = { sort, dir, defaultDir: DEFAULT_DIR, pathname: "/audit", extraQuery: query, className: TH, children: <ColResizer /> };

  return (
    <div className="space-y-5">
      <PageHeader title="Audit log" />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <TableFilterBar
          pathname="/audit"
          filters={selects}
          defs={[
            { key: "userId", label: "User", allLabel: "All users", options: users.map((u) => ({ value: u.id, label: u.name })) },
            { key: "action", label: "Action", allLabel: "All actions", options: actions.map((a) => ({ value: a, label: a })) },
            { key: "entityType", label: "Entity", allLabel: "All entities", options: entityTypes.map((e) => ({ value: e, label: e })) },
          ]}
          dates={{ from, to }}
          keep={{ sort, dir, ...(size !== PAGE_SIZES[0] && { size: String(size) }) }}
        />
        <ResetColumnWidths scope={SCOPE} className={RESET} />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <RestoreColumnWidths scope={SCOPE} />
          <table data-resizable={SCOPE} className="w-full text-[13px] leading-5">
            <thead className="border-b-2 border-gline bg-gbg text-left">
              <tr>
                <SortableTH label="Time" sortKey="time" {...sortable} />
                <SortableTH label="User" sortKey="user" {...sortable} />
                <SortableTH label="Action" sortKey="action" {...sortable} />
                <SortableTH label="Entity" sortKey="entity" {...sortable} />
                <th data-col="Summary" className={TH}>Summary<ColResizer /></th>
                <th data-col="IP" className={TH}>IP<ColResizer /></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const href = entityHref(r.entityType, r.entityId);
                const who = r.userId ? nameOf.get(r.userId) : null;
                return (
                  <tr key={r.id} className="border-b border-gline-2 last:border-0 hover:bg-ghover/70">
                    <td className={`${TD} whitespace-nowrap tabular-nums text-ggrey`} title={dateTime(r.createdAt)}>{shortDate(r.createdAt)}</td>
                    <td className={`${TD} whitespace-nowrap text-gink-2`} title={who ?? undefined}>
                      {who ? shortName(who) : r.userId ? <span className="text-ggrey-2">Deleted user</span> : "—"}
                    </td>
                    <td className={TD}>
                      <span className={`rounded px-1.5 py-0.5 font-mono text-[11px] ${r.action.includes("failed") || r.action.endsWith("delete") ? "bg-gred-50 text-gred" : "bg-ghover text-gink-2"}`}>
                        {r.action}
                      </span>
                    </td>
                    <td className={`${TD} whitespace-nowrap text-ggrey-2`}>{r.entityType ?? "—"}</td>
                    <td className={`${TD} text-gink-2`}>
                      {href ? <Link href={href} className="hover:text-gblue hover:underline">{r.summary}</Link> : r.summary}
                    </td>
                    <td className={`${TD} whitespace-nowrap tabular-nums text-ggrey-2`} title={r.userAgent ?? undefined}>{r.ip ?? "—"}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-ggrey">
                    {filtered ? "No audit entries match these filters." : "Nothing has been logged yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination pathname="/audit" query={query} page={page} size={size} total={total} sizes={PAGE_SIZES} />
      </Card>
    </div>
  );
}
