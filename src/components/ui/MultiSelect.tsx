"use client";
import { Popover } from "@/components/ui/Popover";
import { cn } from "@/lib/cn";

export type Option = { value: string; label: string };

const WIDTH = 232;

/**
 * Filter dropdown that accepts several values at once. Selecting nothing means "all",
 * which is what an empty filter array means everywhere downstream (src/lib/table.ts).
 */
export function MultiSelect({ label, allLabel, options, selected, onChange, className }: {
  label: string;
  allLabel: string;
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  className?: string;
}) {
  const chosen = new Set(selected);
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;

  function toggle(value: string) {
    onChange(chosen.has(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  const summary =
    selected.length === 0 ? allLabel
    : selected.length === 1 ? labelOf(selected[0])
    : `${labelOf(selected[0])} +${selected.length - 1}`;

  return (
    <Popover
      label={label}
      width={WIDTH}
      triggerClassName={(open) => cn(
        "flex h-9 min-w-[9rem] max-w-56 items-center gap-1.5 rounded-md border border-gline bg-gsurface pl-3 pr-2 text-[13px] outline-none transition-colors hover:border-ggrey-2",
        open && "border-gblue ring-2 ring-gblue/25",
        selected.length > 0 ? "text-gink" : "text-ggrey",
        className,
      )}
      trigger={(open) => (
        <>
          <span className="truncate" title={selected.length ? selected.map(labelOf).join(", ") : allLabel}>{summary}</span>
          <span className="material-symbols-outlined ml-auto shrink-0 text-ggrey-2" style={{ fontSize: 18 }}>
            {open ? "expand_less" : "expand_more"}
          </span>
        </>
      )}
    >
      {options.length === 0 && <p className="px-3 py-2 text-xs text-ggrey">Nothing to filter by</p>}
      <ul className="max-h-64 overflow-y-auto">
        {options.map((o) => (
          <li key={o.value}>
            <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[13px] text-gink hover:bg-ghover">
              <input type="checkbox" checked={chosen.has(o.value)} onChange={() => toggle(o.value)} className="accent-gblue" />
              <span className="truncate" title={o.label}>{o.label}</span>
            </label>
          </li>
        ))}
      </ul>
      {selected.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="w-full border-t border-gline-2 px-3 py-1.5 text-left text-[11px] font-medium text-gblue hover:bg-ghover"
        >
          Clear {label.toLowerCase()}
        </button>
      )}
    </Popover>
  );
}
