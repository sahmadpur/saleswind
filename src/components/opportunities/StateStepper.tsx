import { ORDER } from "@/lib/domain/lifecycle";

const LABEL: Record<string, string> = { PROSPECT: "Prospect", SALES: "Sales", CONTRACT: "Contract", PROJECT: "Project" };

export function StateStepper({ state, cancelled }: { state: string; cancelled: boolean }) {
  const currentIdx = ORDER.indexOf(state as (typeof ORDER)[number]);
  return (
    <div className="flex items-center gap-2">
      {ORDER.map((s, i) => {
        const done = i <= currentIdx && !cancelled;
        return (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${done ? "bg-blue-600 text-white" : "bg-neutral-200 text-neutral-500"}`}>{i + 1}</div>
            <span className={`text-sm ${i === currentIdx && !cancelled ? "font-medium text-neutral-900" : "text-neutral-500"}`}>{LABEL[s]}</span>
            {i < ORDER.length - 1 && <span className="text-neutral-300">→</span>}
          </div>
        );
      })}
      {cancelled && <span className="ml-3 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">Cancelled</span>}
    </div>
  );
}
