import { ORDER } from "@/lib/domain/lifecycle";
import { cn } from "@/lib/cn";

const LABEL: Record<string, string> = { PROSPECT: "Prospect", SALES: "Sales", CONTRACT: "Contract", PROJECT: "Project" };

export function StageStepper({ stage }: { stage: string }) {
  const currentIdx = ORDER.indexOf(stage as (typeof ORDER)[number]);
  return (
    <div className="flex items-center">
      {ORDER.map((s, i) => {
        const done = i < currentIdx;
        const current = i === currentIdx;
        const active = done || current;
        return (
          <div key={s} className="flex items-center">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-full text-xs font-semibold transition-colors",
                  current && "bg-gink text-white",
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
              <span className={cn("text-sm", current ? "font-semibold text-gink" : "text-ggrey")}>{LABEL[s]}</span>
            </div>
            {i < ORDER.length - 1 && (
              <div className={cn("mx-3 h-px w-8 sm:w-14", i < currentIdx ? "bg-gblue-200" : "bg-gline")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
