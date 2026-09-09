import { cn } from "@/lib/cn";

export function Chip({ label, onRemove, className }: { label: string; onRemove?: () => void; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border border-gline bg-gsurface py-0.5 pl-2 pr-1.5 text-xs font-medium text-gink-2 transition-colors hover:bg-ghover", className)}>
      <span className="truncate" title={label}>{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="grid h-4 w-4 place-items-center rounded-full text-ggrey-2 transition-colors hover:bg-gline hover:text-gink"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
        </button>
      )}
    </span>
  );
}
