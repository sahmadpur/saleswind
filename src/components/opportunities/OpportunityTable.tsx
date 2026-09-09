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

const TH = "px-2 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-gink";
const TD = "px-2 py-2";
const COLS = 12;
// Left rail colour per pipeline state — the one bit of colour on each row.
const RAIL: Record<string, string> = {
  PROSPECT: "var(--color-gyellow)", SALES: "var(--color-gsales)", CONTRACT: "var(--color-gviolet)",
  PROJECT: "var(--color-ggreen)", CANCELLED: "var(--color-gline)",
};

function BodyRow({ o }: { o: Row }) {
  return (
    <RowLink
      href={`/opportunities/${o.id}`}
      className={`border-b border-gline-2 transition-colors last:border-0 hover:bg-ghover/70 ${o.isCancelled ? "opacity-55" : ""}`}
    >
      <td
        className={`${TD} whitespace-nowrap tabular-nums text-ggrey`}
        style={{ boxShadow: `inset 3px 0 0 ${RAIL[o.isCancelled ? "CANCELLED" : o.state]}` }}
      >
        {opportunityRef(o.number)}
      </td>
      <td className={`${TD} max-w-[16rem]`}>
        <Link
          href={`/opportunities/${o.id}`}
          title={o.title}
          className="block truncate text-[12px] font-semibold uppercase tracking-[0.03em] text-gink hover:text-gblue"
        >
          {o.title}
        </Link>
      </td>
      <td className={`${TD} whitespace-nowrap text-gink-2`}>{o.account.name}</td>
      <td className={TD}><Pill state={o.isCancelled ? "CANCELLED" : o.state} /></td>
      <td className={`${TD} whitespace-nowrap text-gink-2`}>{o.status?.label ?? "—"}</td>
      <td className={TD}>
        <div className="flex flex-wrap gap-1">
          {o.tags.map((t) => <Chip key={t.tag.label} label={t.tag.label} className="max-w-36" />)}
        </div>
      </td>
      <td className={`${TD} whitespace-nowrap text-right tabular-nums text-gink-2`}>{money(Number(o.revenue))}</td>
      <td className={`${TD} whitespace-nowrap text-right tabular-nums text-gink-2`}>{Number(o.marginPct)}%</td>
      <td className={`${TD} whitespace-nowrap text-right font-medium tabular-nums text-gink`}>
        {money(grossProfit(Number(o.revenue), Number(o.marginPct)))}
      </td>
      <td className={`${TD} whitespace-nowrap text-gink-2`}>{o.accountable.name}</td>
      <td className={`${TD} whitespace-nowrap text-ggrey-2`}>{shortDate(new Date(o.createdAt))}</td>
      <td className={`${TD} whitespace-nowrap text-ggrey-2`}>{relativeTime(new Date(o.lastModifiedAt))}</td>
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
      <table className="w-full text-[13px] leading-5 tabular-nums">
        <thead className="border-b-2 border-gline bg-gbg text-left">
          <tr>
            <SortableTH label="ID" sortKey="ref" {...sortable} />
            <SortableTH label="Title" sortKey="title" {...sortable} />
            <SortableTH label="Account" sortKey="account" {...sortable} />
            <th className={TH}>State</th>
            <th className={TH}>Status</th>
            <th className={TH}>Tags</th>
            <SortableTH label="PR" sortKey="revenue" align="right" {...sortable} />
            <SortableTH label="MR" sortKey="margin" align="right" {...sortable} />
            <SortableTH label="PGP" sortKey="gp" align="right" {...sortable} />
            <SortableTH label="Accountable" sortKey="accountable" {...sortable} />
            <SortableTH label="Created" sortKey="created" {...sortable} />
            <SortableTH label="Modified" sortKey="modified" {...sortable} />
          </tr>
        </thead>
        <tbody>
          {monthGroups
            ? monthGroups.map((g) => (
                <Fragment key={g.key}>
                  <tr className="border-y border-gline-2 bg-gbg/60">
                    <td colSpan={COLS} className="px-2.5 py-1.5 text-xs font-semibold text-gink">
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
    </div>
  );
}
