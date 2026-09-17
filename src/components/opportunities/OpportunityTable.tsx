import Link from "next/link";
import { Pill } from "@/components/ui/Pill";
import { Chip } from "@/components/ui/Chip";
import { StatusPill } from "@/components/ui/StatusPill";
import { RowLink } from "@/components/ui/RowLink";
import { SortableTH } from "@/components/ui/SortableTH";
import { ColResizer, RestoreColumnWidths } from "@/components/ui/ColResizer";
import { EditableCell } from "@/components/opportunities/EditableCell";
import { updateOpportunityFieldAction } from "@/actions/opportunity-actions";
import { grossProfit } from "@/lib/domain/finance";
import { money, shortDate, opportunityRef, shortName, dateTime } from "@/lib/format";
import { displayStage, type SortDir, type SortKey } from "@/lib/opportunity-sort";

type Row = {
  id: string; number: number; title: string; stage: string; isCancelled: boolean;
  revenue: unknown; marginPct: unknown; accountableId: string; statusId: string | null;
  account: { name: string }; accountable: { name: string }; status: { label: string; color: string } | null;
  tags: { tag: { label: string } }[]; lastModifiedAt: Date;
};
type Option = { value: string; label: string };
export type EditOptions = { users: Option[]; statusesByStage: Record<string, Option[]> };

const TH = "relative px-2 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-gink";
const TD = "px-2 py-2";
// Left rail colour per pipeline stage — the one bit of colour on each row.
const RAIL: Record<string, string> = {
  PROSPECT: "var(--color-gyellow)", SALES: "var(--color-gsales)", CONTRACT: "var(--color-gviolet)",
  PROJECT: "var(--color-ggreen)", CANCELLED: "var(--color-gline)",
};

function BodyRow({ o, edit }: { o: Row; edit: EditOptions | null }) {
  const revenue = Number(o.revenue), margin = Number(o.marginPct);
  const save = (field: "title" | "statusId" | "accountableId" | "revenue" | "marginPct") => updateOpportunityFieldAction.bind(null, o.id, field);
  const titleLink = (
    <Link
      href={`/opportunities/${o.id}`}
      title={o.title}
      className="block min-w-0 truncate text-[12px] font-semibold uppercase tracking-[0.03em] text-gink hover:text-gblue"
    >
      {o.title}
    </Link>
  );
  const statusDisplay = o.status ? <StatusPill label={o.status.label} color={o.status.color} /> : <span className="text-ggrey-2">—</span>;
  return (
    <RowLink
      href={`/opportunities/${o.id}`}
      className={`border-b border-gline-2 transition-colors last:border-0 hover:bg-ghover/70 ${o.isCancelled ? "opacity-55" : ""}`}
    >
      <td
        className={`${TD} whitespace-nowrap tabular-nums text-ggrey`}
        style={{ boxShadow: `inset 3px 0 0 ${RAIL[displayStage(o)]}` }}
      >
        {opportunityRef(o.number)}
      </td>
      <td className={`${TD} max-w-[12rem]`}>
        {edit ? <EditableCell value={o.title} display={titleLink} kind="text" save={save("title")} label="title" iconTrigger /> : titleLink}
      </td>
      <td className={`${TD} max-w-[8rem] truncate text-gink-2`} title={o.account.name}>{o.account.name}</td>
      <td className={TD}><Pill stage={displayStage(o)} /></td>
      <td className={`${TD} text-gink-2`}>
        {edit ? (
          <EditableCell
            value={o.statusId ?? ""}
            display={statusDisplay}
            kind="select"
            options={[{ value: "", label: "No status" }, ...(edit.statusesByStage[o.stage] ?? [])]}
            save={save("statusId")}
            label="status"
          />
        ) : statusDisplay}
      </td>
      <td className={TD}>
        <div className="flex flex-wrap gap-1">
          {o.tags.map((t) => <Chip key={t.tag.label} label={t.tag.label} className="max-w-28" />)}
        </div>
      </td>
      <td className={`${TD} whitespace-nowrap text-right tabular-nums text-gink-2`}>
        {edit ? <EditableCell value={String(revenue)} display={money(revenue)} kind="number" align="right" save={save("revenue")} label="PR" /> : money(revenue)}
      </td>
      <td className={`${TD} whitespace-nowrap text-right tabular-nums text-gink-2`}>
        {edit ? <EditableCell value={String(margin)} display={`${margin}%`} kind="number" align="right" save={save("marginPct")} label="MR" /> : `${margin}%`}
      </td>
      <td className={`${TD} whitespace-nowrap text-right font-medium tabular-nums text-gink`}>
        {money(grossProfit(revenue, margin))}
      </td>
      <td className={`${TD} text-gink-2`} title={o.accountable.name}>
        {edit ? (
          <EditableCell value={o.accountableId} display={shortName(o.accountable.name)} kind="select" options={edit.users} save={save("accountableId")} label="accountable" />
        ) : shortName(o.accountable.name)}
      </td>
      <td className={`${TD} whitespace-nowrap leading-4 text-ggrey-2`} title={dateTime(new Date(o.lastModifiedAt))}>
        {shortDate(new Date(o.lastModifiedAt))}
        <span className="block text-[11px] text-ggrey-2/80">{dateTime(new Date(o.lastModifiedAt)).split(", ")[1]}</span>
      </td>
    </RowLink>
  );
}

export function OpportunityTable({ rows, sort, dir, query, filtered, edit, footer }: {
  rows: Row[]; sort: SortKey; dir: SortDir; query: Record<string, string>; filtered: boolean;
  edit: EditOptions | null; footer?: React.ReactNode;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-ghover text-ggrey-2">
          <span className="material-symbols-outlined" style={{ fontSize: 28 }}>{filtered ? "filter_alt_off" : "inbox"}</span>
        </span>
        <p className="text-sm font-medium text-gink">{filtered ? "No opportunities match these filters" : "No opportunities yet"}</p>
        {!filtered && <p className="max-w-xs text-sm text-ggrey">Create your first opportunity to start building your pipeline.</p>}
      </div>
    );
  }
  const sortable = { sort, dir, pathname: "/opportunities", extraQuery: { ...query, view: "table" }, className: TH, children: <ColResizer /> };
  return (
    <>
      <div className="overflow-x-auto">
        <RestoreColumnWidths />
        <table data-resizable className="w-full text-[13px] leading-5 tabular-nums">
          <thead className="border-b-2 border-gline bg-gbg text-left">
            <tr>
              <SortableTH label="ID" sortKey="ref" {...sortable} />
              <SortableTH label="Title" sortKey="title" {...sortable} />
              <SortableTH label="Account" sortKey="account" {...sortable} />
              <SortableTH label="Stage" sortKey="stage" {...sortable} />
              <SortableTH label="Status" sortKey="status" {...sortable} />
              <th data-col="Tags" className={TH}>Tags<ColResizer /></th>
              <SortableTH label="PR" sortKey="revenue" align="right" {...sortable} />
              <SortableTH label="MR" sortKey="margin" align="right" {...sortable} />
              <SortableTH label="PGP" sortKey="gp" align="right" {...sortable} />
              <SortableTH label="Accountable" sortKey="accountable" {...sortable} />
              <SortableTH label="Modified" sortKey="modified" {...sortable} />
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => <BodyRow key={o.id} o={o} edit={edit} />)}
          </tbody>
        </table>
      </div>
      {footer}
    </>
  );
}
