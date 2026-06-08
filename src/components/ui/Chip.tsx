export function Chip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-gline bg-gsurface py-1 pl-3 pr-2 text-xs font-medium text-gink-2 transition-colors hover:bg-ghover">
      {label}
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
