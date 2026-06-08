export function Chip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-700">
      {label}
      {onRemove && <button type="button" onClick={onRemove} className="text-neutral-400 hover:text-neutral-700">×</button>}
    </span>
  );
}
