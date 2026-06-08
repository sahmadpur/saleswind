import { cn } from "@/lib/cn";

const STATE_STYLES: Record<string, string> = {
  PROSPECT: "bg-amber-50 text-amber-700",
  SALES: "bg-blue-50 text-blue-700",
  CONTRACT: "bg-violet-50 text-violet-700",
  PROJECT: "bg-emerald-50 text-emerald-700",
};

export function Pill({ state }: { state: string }) {
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATE_STYLES[state] ?? "bg-neutral-100 text-neutral-700")}>
      {state.charAt(0) + state.slice(1).toLowerCase()}
    </span>
  );
}
