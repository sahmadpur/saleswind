import { Fragment } from "react";
import Link from "next/link";
import { Pill } from "@/components/ui/Pill";
import { Chip } from "@/components/ui/Chip";
import { RowLink } from "@/components/ui/RowLink";
import { SortableTH } from "@/components/ui/SortableTH";
import { grossProfit } from "@/lib/domain/finance";
import { money, relativeTime, shortDate, opportunityRef } from "@/lib/format";
import { groupByMonth, type SortDir, type SortKey } from "@/lib/opportunity-sort";

type Row = {
  id: string; number: number; title: string; state: string; isCancelled: boolean;
  revenue: unknown; marginPct: unknown;
  account: { name: string }; accountable: { name: string }; status: { label: string } | null;
  tags: { tag: { label: string } }[]; createdAt: Date; lastModifiedAt: Date;
};

const TH = "px-2 py-2 text-xs font-medium uppercase tracking-wide text-ggrey";
const TD = "px-2 py-1.5";
const COLS = 13;

function OpenButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-7 items-center rounded-full border border-gline px-3 text-xs font-medium text-gblue transition-colors hover:bg-gblue-50"
    >
      Open
    </Link>
  );
}

function BodyRow({ o }: { o: Row }) {
  return (
    <RowLink
      href={`/opportunities/${o.id}`}
      className={`border-b border-gline-2 transition-colors last:border-0 hover:bg-gblue-50/60 ${o.isCancelled ? "opacity-55" : ""}`}
    >
      <td className={`${TD} whitespace-nowrap font-medium tabular-nums text-ggrey-2`}>{opportunityRef(o.number)}</td>
      <td className={TD}>
        <Link href={`/opportunities/${o.id}`} className="font-medium text-gblue hover:underline">
          {o.title}
        </Link>
      </td>
      <td className={`${TD} text-gink-2`}>{o.account.name}</td>
      <td className={TD}><Pill state={o.isCancelled ? "CANCELLED" : o.state} /></td>
      <td className={`${TD} text-gink-2`}>{o.status?.label ?? "—"}</td>
      <td className={TD}>
        <div className="flex flex-wrap gap-1">
          {o.tags.map((t) => <Chip key={t.tag.label} label={t.tag.label} className="max-w-36" />)}
        </div>
      </td>
      <td className={`${TD} whitespace-nowrap text-right tabular-nums text-gink-2`}>{money(Number(o.revenue))}</td>
      <td className={`${TD} text-right tabular-nums text-gink-2`}>{Number(o.marginPct)}%</td>
      <td className={`${TD} whitespace-nowrap text-right font-medium tabular-nums text-gink`}>
        {money(grossProfit(Number(o.revenue), Number(o.marginPct)))}
      </td>
      <td className={`${TD} whitespace-nowrap text-gink-2`}>{o.accountable.name}</td>
      <td className={`${TD} whitespace-nowrap text-ggrey-2`}>{shortDate(new Date(o.createdAt))}</td>
      <td className={`${TD} whitespace-nowrap text-ggrey-2`}>{relativeTime(new Date(o.lastModifiedAt))}</td>
      <td className={`${TD} text-right`}><OpenButton href={`/opportunities/${o.id}`} /></td>
    </RowLink>
  );
}

export function OpportunityTable({ rows, sort, dir }: { rows: Row[]; sort: SortKey; dir: SortDir }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-ghover text-ggrey-2">
          <span className="material-symbols-outlined" style={{ fontSize: 28 }}>inbox</span>
        </span>
        <p className="text-sm font-medium text-gink">No opportunities yet</p>
        <p className="max-w-xs text-sm text-ggrey">Create your first opportunity to start building your pipeline.</p>
      </div>
    );
  }
  const sortable = { sort, dir, pathname: "/opportunities", extraQuery: { view: "table" }, className: TH };
  // Month sections only make sense when rows are ordered by their created date.
  const monthGroups = sort === "created" ? groupByMonth(rows) : null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px] leading-5">
        <thead className="border-b border-gline-2 bg-gbg text-left">
          <tr>
            <SortableTH label="Ref" sortKey="ref" {...sortable} />
            <SortableTH label="Title" sortKey="title" {...sortable} />
            <SortableTH label="Account" sortKey="account" {...sortable} />
            <th className={TH}>State</th>
            <th className={TH}>Status</th>
            <th className={TH}>Tags</th>
            <SortableTH label="Predicted revenue" sortKey="revenue" align="right" {...sortable} />
            <SortableTH label="Margin" sortKey="margin" align="right" {...sortable} />
            <SortableTH label="Predicted GP" sortKey="gp" align="right" {...sortable} />
            <SortableTH label="Accountable" sortKey="accountable" {...sortable} />
            <SortableTH label="Created" sortKey="created" {...sortable} />
            <SortableTH label="Modified" sortKey="modified" {...sortable} />
            <th className={TH}><span className="sr-only">Open</span></th>
          </tr>
        </thead>
        <tbody>
          {monthGroups
            ? monthGroups.map((g) => (
                <Fragment key={g.key}>
                  <tr className="border-y border-gline-2 bg-gbg">
                    <td colSpan={COLS} className="px-2.5 py-1.5 text-xs font-medium text-gink">
                      {g.label}
                      <span className="font-normal text-ggrey">
                        {" "}· {g.count} {g.count === 1 ? "deal" : "deals"} · {money(g.revenue)} predicted revenue · {money(g.gp)} predicted GP
                      </span>
                    </td>
                  </tr>
                  {g.rows.map((o) => <BodyRow key={o.id} o={o} />)}
                </Fragment>
              ))
            : rows.map((o) => <BodyRow key={o.id} o={o} />)}
        </tbody>
      </table>
      <div className="border-t border-gline-2 bg-gbg px-4 py-2 text-xs text-ggrey">
        Showing {rows.length} {rows.length === 1 ? "opportunity" : "opportunities"}
        {" "}· {rows.filter((r) => !r.isCancelled).length} active
        {" "}· {rows.filter((r) => r.isCancelled).length} cancelled
      </div>
    </div>
  );
}
