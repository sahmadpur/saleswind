import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { listAudit, AUDIT_PAGE_SIZE, type AuditFilters } from "@/services/audit-service";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { dateTime, shortName } from "@/lib/format";
import { parsePage } from "@/lib/pagination";

const TH = "px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-gink";
const TD = "px-3 py-2 align-top";
const FILTER_KEYS = ["userId", "action", "entityType", "from", "to"] as const;

/** Where an audited entity lives in the app, if it has a page. */
function entityHref(type: string | null, id: string | null): string | null {
  if (!type) return null;
  switch (type) {
    case "opportunity": return id ? `/opportunities/${id}` : null;
    case "account": return id ? `/accounts/${id}` : null;
    case "user": return "/users";
    case "status": case "tag": case "definition": return "/dictionary";
    default: return null;
  }
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireRole("audit:view");
  const params = await searchParams;
  const filters: AuditFilters = {};
  for (const k of FILTER_KEYS) if (params[k]) filters[k] = params[k];
  const { page } = parsePage(params, [AUDIT_PAGE_SIZE]);

  const [{ rows, total, actions, entityTypes }, users] = await Promise.all([
    listAudit(filters, page),
    db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const nameOf = new Map(users.map((u) => [u.id, u.name]));

  return (
    <div className="space-y-5">
      <PageHeader title="Audit log" />

      <form method="get" className="flex flex-wrap items-end gap-2">
        <Select name="userId" defaultValue={filters.userId ?? ""} aria-label="User" className="h-9 text-[13px]" style={{ width: "auto" }}>
          <option value="">All users</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </Select>
        <Select name="action" defaultValue={filters.action ?? ""} aria-label="Action" className="h-9 text-[13px]" style={{ width: "auto" }}>
          <option value="">All actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </Select>
        <Select name="entityType" defaultValue={filters.entityType ?? ""} aria-label="Entity" className="h-9 text-[13px]" style={{ width: "auto" }}>
          <option value="">All entities</option>
          {entityTypes.map((e) => <option key={e} value={e}>{e}</option>)}
        </Select>
        <label className="flex items-center gap-1.5 text-xs text-ggrey">
          From <Input type="date" name="from" defaultValue={filters.from} className="h-9 w-auto text-[13px]" />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-ggrey">
          To <Input type="date" name="to" defaultValue={filters.to} className="h-9 w-auto text-[13px]" />
        </label>
        <Button type="submit" variant="outline">Apply</Button>
        {Object.keys(filters).length > 0 && (
          <Link href="/audit" className="inline-flex h-9 items-center px-3 text-sm font-medium text-gblue hover:underline">Clear</Link>
        )}
      </form>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] leading-5">
            <thead className="border-b-2 border-gline bg-gbg text-left">
              <tr>
                <th className={`${TH} w-40`}>Time</th>
                <th className={`${TH} w-32`}>User</th>
                <th className={`${TH} w-44`}>Action</th>
                <th className={TH}>Summary</th>
                <th className={`${TH} w-32`}>IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const href = entityHref(r.entityType, r.entityId);
                const who = r.userId ? nameOf.get(r.userId) : null;
                return (
                  <tr key={r.id} className="border-b border-gline-2 last:border-0 hover:bg-ghover/70">
                    <td className={`${TD} whitespace-nowrap tabular-nums text-ggrey`}>{dateTime(r.createdAt)}</td>
                    <td className={`${TD} whitespace-nowrap text-gink-2`} title={who ?? undefined}>
                      {who ? shortName(who) : r.userId ? <span className="text-ggrey-2">Deleted user</span> : "—"}
                    </td>
                    <td className={TD}>
                      <span className={`rounded px-1.5 py-0.5 font-mono text-[11px] ${r.action.includes("failed") || r.action.endsWith("delete") ? "bg-gred-50 text-gred" : "bg-ghover text-gink-2"}`}>
                        {r.action}
                      </span>
                    </td>
                    <td className={`${TD} text-gink-2`}>
                      {href ? <Link href={href} className="hover:text-gblue hover:underline">{r.summary}</Link> : r.summary}
                    </td>
                    <td className={`${TD} whitespace-nowrap tabular-nums text-ggrey-2`} title={r.userAgent ?? undefined}>{r.ip ?? "—"}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-ggrey">No audit entries match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination pathname="/audit" query={filters as Record<string, string>} page={page} size={AUDIT_PAGE_SIZE} total={total} />
      </Card>
    </div>
  );
}
