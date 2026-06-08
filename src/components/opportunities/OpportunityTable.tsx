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

export function OpportunityTable({ rows }: { rows: Row[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="border-b border-neutral-200 text-left text-neutral-500">
        <tr>
          <th className="p-3">Title</th><th className="p-3">Account</th><th className="p-3">State</th>
          <th className="p-3">Status</th><th className="p-3">Tags</th><th className="p-3 text-right">Revenue</th>
          <th className="p-3 text-right">Margin</th><th className="p-3 text-right">Gross profit</th>
          <th className="p-3">Owner</th><th className="p-3">Last modified</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((o) => (
          <tr key={o.id} className={`border-b border-neutral-100 hover:bg-neutral-50 ${o.isCancelled ? "opacity-50" : ""}`}>
            <td className="p-3"><Link href={`/opportunities/${o.id}`} className="font-medium text-blue-600 hover:underline">{o.title}</Link></td>
            <td className="p-3">{o.account.name}</td>
            <td className="p-3"><Pill state={o.isCancelled ? "CANCELLED" : o.state} /></td>
            <td className="p-3">{o.status?.label ?? "—"}</td>
            <td className="p-3"><div className="flex flex-wrap gap-1">{o.tags.map((t) => <Chip key={t.tag.label} label={t.tag.label} />)}</div></td>
            <td className="p-3 text-right">{money(Number(o.revenue))}</td>
            <td className="p-3 text-right">{Number(o.marginPct)}%</td>
            <td className="p-3 text-right font-medium">{money(grossProfit(Number(o.revenue), Number(o.marginPct)))}</td>
            <td className="p-3">{o.owner.name}</td>
            <td className="p-3 text-neutral-500">{relativeTime(new Date(o.lastModifiedAt))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
