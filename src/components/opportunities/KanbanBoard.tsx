import Link from "next/link";
import { ORDER } from "@/lib/domain/lifecycle";
import { grossProfit } from "@/lib/domain/finance";
import { money } from "@/lib/format";

type Row = {
  id: string; title: string; state: string; isCancelled: boolean;
  revenue: unknown; marginPct: unknown; account: { name: string };
};

const LABEL: Record<string, string> = { PROSPECT: "Prospect", SALES: "Sales", CONTRACT: "Contract", PROJECT: "Project" };

export function KanbanBoard({ rows }: { rows: Row[] }) {
  const active = rows.filter((r) => !r.isCancelled);
  return (
    <div className="grid grid-cols-4 gap-4">
      {ORDER.map((state) => {
        const items = active.filter((r) => r.state === state);
        return (
          <div key={state} className="rounded-2xl bg-neutral-100 p-3">
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="text-sm font-medium text-neutral-700">{LABEL[state]}</span>
              <span className="text-xs text-neutral-400">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((o) => (
                <Link key={o.id} href={`/opportunities/${o.id}`} className="block rounded-xl bg-white p-3 shadow-sm hover:shadow">
                  <div className="text-sm font-medium text-neutral-900">{o.title}</div>
                  <div className="text-xs text-neutral-500">{o.account.name}</div>
                  <div className="mt-2 text-xs text-neutral-700">{money(grossProfit(Number(o.revenue), Number(o.marginPct)))} GP</div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
