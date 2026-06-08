import Link from "next/link";
import { Pill } from "@/components/ui/Pill";
import { Chip } from "@/components/ui/Chip";
import { grossProfit } from "@/lib/domain/finance";
import { money, relativeTime } from "@/lib/format";

type Row = {
  id: string; title: string; state: string; isCancelled: boolean;
  revenue: unknown; marginPct: unknown;
  account: { name: string }; owner: { name: string }; status: { label: string } | null;
  tags: { tag: { label: string } }[]; lastModifiedAt: Date;
};

const TH = "px-4 py-3 text-xs font-medium uppercase tracking-wide text-ggrey";

export function OpportunityTable({ rows }: { rows: Row[] }) {
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
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-gline-2 bg-gbg text-left">
          <tr>
            <th className={TH}>Title</th>
            <th className={TH}>Account</th>
            <th className={TH}>State</th>
            <th className={TH}>Status</th>
            <th className={TH}>Tags</th>
            <th className={`${TH} text-right`}>Revenue</th>
            <th className={`${TH} text-right`}>Margin</th>
            <th className={`${TH} text-right`}>Gross profit</th>
            <th className={TH}>Owner</th>
            <th className={TH}>Modified</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr
              key={o.id}
              className={`border-b border-gline-2 transition-colors last:border-0 hover:bg-gblue-50/60 ${o.isCancelled ? "opacity-55" : ""}`}
            >
              <td className="px-4 py-3">
                <Link href={`/opportunities/${o.id}`} className="font-medium text-gblue hover:underline">
                  {o.title}
                </Link>
              </td>
              <td className="px-4 py-3 text-gink-2">{o.account.name}</td>
              <td className="px-4 py-3"><Pill state={o.isCancelled ? "CANCELLED" : o.state} /></td>
              <td className="px-4 py-3 text-gink-2">{o.status?.label ?? "—"}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {o.tags.map((t) => <Chip key={t.tag.label} label={t.tag.label} />)}
                </div>
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-gink-2">{money(Number(o.revenue))}</td>
              <td className="px-4 py-3 text-right tabular-nums text-gink-2">{Number(o.marginPct)}%</td>
              <td className="px-4 py-3 text-right font-medium tabular-nums text-gink">
                {money(grossProfit(Number(o.revenue), Number(o.marginPct)))}
              </td>
              <td className="px-4 py-3 text-gink-2">{o.owner.name}</td>
              <td className="px-4 py-3 text-ggrey-2">{relativeTime(new Date(o.lastModifiedAt))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
