import { cn } from "@/lib/cn";

const STAGE_STYLES: Record<string, { wrap: string; dot: string }> = {
  PROSPECT: { wrap: "bg-gyellow-50 text-gyellow-dark", dot: "bg-gyellow" },
  SALES: { wrap: "bg-gsales-50 text-gsales", dot: "bg-gsales" },
  CONTRACT: { wrap: "bg-gviolet-50 text-gviolet", dot: "bg-gviolet" },
  PROJECT: { wrap: "bg-ggreen-50 text-ggreen", dot: "bg-ggreen" },
  CANCELLED: { wrap: "bg-gred-50 text-gred", dot: "bg-gred" },
};

export function Pill({ stage }: { stage: string }) {
  const s = STAGE_STYLES[stage] ?? { wrap: "bg-ghover text-ggrey", dot: "bg-ggrey-2" };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        s.wrap,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {stage.charAt(0) + stage.slice(1).toLowerCase()}
    </span>
  );
}
