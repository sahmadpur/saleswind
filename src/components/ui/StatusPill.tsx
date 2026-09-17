import { cn } from "@/lib/cn";
import { statusColor } from "@/lib/status-colors";

export function StatusPill({ label, color, className }: { label: string; color?: string | null; className?: string }) {
  const c = statusColor(color);
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", c.wrap, className)}>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", c.dot)} />
      <span className="truncate">{label}</span>
    </span>
  );
}
