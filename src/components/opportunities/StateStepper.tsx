import { ORDER } from "@/lib/domain/lifecycle";
import { cn } from "@/lib/cn";

const LABEL: Record<string, string> = { PROSPECT: "Prospect", SALES: "Sales", CONTRACT: "Contract", PROJECT: "Project" };

export function StateStepper({ state, cancelled }: { state: string; cancelled: boolean }) {
  const currentIdx = ORDER.indexOf(state as (typeof ORDER)[number]);
  return (
    <div className="flex items-center">
      {ORDER.map((s, i) => {
        const done = i < currentIdx && !cancelled;
        const current = i === currentIdx && !cancelled;
        const active = done || current;
        return (
          <div key={s} className="flex items-center">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full text-xs font-medium transition-colors",
                  current && "bg-gblue text-white shadow-g1",
                  done && "bg-gblue-100 text-gblue-dark",
                  !active && "bg-ghover text-ggrey-2",
                )}
              >
                {done ? (
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check</span>
                ) : (
                  i + 1
                )}
              </div>
              <span className={cn("text-sm", current ? "font-medium text-gink" : "text-ggrey")}>{LABEL[s]}</span>
            </div>
            {i < ORDER.length - 1 && (
              <div className={cn("mx-3 h-px w-8 sm:w-14", i < currentIdx && !cancelled ? "bg-gblue-200" : "bg-gline")} />
            )}
          </div>
        );
      })}
      {cancelled && (
        <span className="ml-4 inline-flex items-center gap-1.5 rounded-full bg-gred-50 px-3 py-1 text-xs font-medium text-gred">
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>cancel</span>
          Cancelled
        </span>
      )}
    </div>
  );
}
