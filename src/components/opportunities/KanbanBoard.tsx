import Link from "next/link";
import { ORDER } from "@/lib/domain/lifecycle";
import { grossProfit } from "@/lib/domain/finance";
import { money } from "@/lib/format";

type Row = {
  id: string; title: string; state: string; isCancelled: boolean;
  revenue: unknown; marginPct: unknown; account: { name: string };
};

const META: Record<string, { label: string; dot: string; bar: string }> = {
  PROSPECT: { label: "Prospect", dot: "bg-gyellow", bar: "bg-gyellow" },
  SALES: { label: "Sales", dot: "bg-gblue", bar: "bg-gblue" },
  CONTRACT: { label: "Contract", dot: "bg-gviolet", bar: "bg-gviolet" },
  PROJECT: { label: "Project", dot: "bg-ggreen", bar: "bg-ggreen" },
};

export function KanbanBoard({ rows }: { rows: Row[] }) {
  const active = rows.filter((r) => !r.isCancelled);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {ORDER.map((state) => {
        const items = active.filter((r) => r.state === state);
        const m = META[state];
        return (
          <div key={state} className="flex flex-col rounded-xl border border-gline-2 bg-gbg">
            <div className={`h-1 rounded-t-xl ${m.bar}`} />
            <div className="flex items-center justify-between px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium text-gink">
                <span className={`h-2 w-2 rounded-full ${m.dot}`} />
                {m.label}
              </span>
              <span className="grid h-6 min-w-6 place-items-center rounded-full bg-gsurface px-2 text-xs font-medium text-ggrey">
                {items.length}
              </span>
            </div>
            <div className="flex flex-col gap-2.5 px-3 pb-3">
              {items.length === 0 && (
                <div className="rounded-lg border border-dashed border-gline px-3 py-6 text-center text-xs text-ggrey-2">
                  Nothing here
                </div>
              )}
              {items.map((o) => (
                <Link
                  key={o.id}
                  href={`/opportunities/${o.id}`}
                  className="g-press group block rounded-xl border border-gline-2 bg-gsurface p-3.5 shadow-g1 transition-shadow hover:shadow-g2"
                >
                  <div className="text-sm font-medium text-gink group-hover:text-gblue">{o.title}</div>
                  <div className="mt-0.5 text-xs text-ggrey">{o.account.name}</div>
                  <div className="mt-3 flex items-center justify-between border-t border-gline-2 pt-2.5">
                    <span className="text-xs text-ggrey-2">Gross profit</span>
                    <span className="text-sm font-medium tabular-nums text-gink">
                      {money(grossProfit(Number(o.revenue), Number(o.marginPct)))}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
