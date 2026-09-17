"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/cn";

type Option = { value: string; label: string };

/**
 * Click-to-edit table cell. Text/number inputs save on Enter or blur, selects save on change; Esc cancels.
 * Renders buttons/inputs only, which RowLink ignores, so editing never navigates.
 */
export function EditableCell({ value, display, kind, options, save, align, className, label, iconTrigger }: {
  value: string;
  display: React.ReactNode;
  kind: "text" | "number" | "select";
  options?: Option[];
  save: (value: string) => Promise<{ error?: string }>;
  align?: "right";
  className?: string;
  label: string;
  /** Keep `display` interactive (e.g. a link) and edit via a pencil button beside it. */
  iconTrigger?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement & HTMLSelectElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
    if (editing && kind !== "select") inputRef.current?.select();
  }, [editing, kind]);

  function open() {
    setDraft(value);
    setError(null);
    setEditing(true);
  }

  function commit(next: string) {
    if (next === value) { setEditing(false); return; }
    start(async () => {
      const res = await save(next);
      if (res.error) { setError(res.error); return; }
      setError(null);
      setEditing(false);
    });
  }

  const field = "h-7 w-full rounded border border-gblue bg-gsurface px-1.5 text-[13px] text-gink outline-none ring-2 ring-gblue/20";

  if (editing) {
    return (
      <div className={cn("relative", pending && "opacity-60")}>
        {kind === "select" ? (
          <select
            ref={inputRef}
            aria-label={label}
            value={draft}
            disabled={pending}
            onChange={(e) => { setDraft(e.target.value); commit(e.target.value); }}
            onBlur={() => { if (!pending) setEditing(false); }}
            onKeyDown={(e) => { if (e.key === "Escape") setEditing(false); }}
            className={field}
          >
            {options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : (
          <input
            ref={inputRef}
            aria-label={label}
            type={kind}
            step={kind === "number" ? "0.01" : undefined}
            value={draft}
            disabled={pending}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => { if (!pending) commit(draft); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commit(draft); }
              if (e.key === "Escape") { setError(null); setEditing(false); }
            }}
            className={cn(field, align === "right" && "text-right tabular-nums")}
          />
        )}
        {error && (
          <div role="alert" className="absolute left-0 top-full z-10 mt-1 whitespace-nowrap rounded bg-gred px-2 py-1 text-[11px] font-medium text-white shadow-g2">
            {error}
          </div>
        )}
      </div>
    );
  }

  if (iconTrigger) {
    return (
      <div className={cn("group/cell flex min-w-0 items-center gap-1", className)}>
        {display}
        <button
          type="button"
          title={`Edit ${label}`}
          aria-label={`Edit ${label}`}
          onClick={open}
          className="grid h-5 w-5 shrink-0 place-items-center rounded text-ggrey-2 opacity-0 transition-opacity hover:bg-gsurface hover:text-gink focus:opacity-100 group-hover/cell:opacity-100"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>edit</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      title={`Edit ${label}`}
      onClick={open}
      className={cn(
        "group/cell -mx-1 flex w-[calc(100%+0.5rem)] min-w-0 items-center gap-1 rounded px-1 py-0.5 text-left transition-colors hover:bg-gsurface hover:ring-1 hover:ring-gline",
        align === "right" && "justify-end text-right",
        className,
      )}
    >
      <span className="min-w-0 truncate">{display}</span>
      <span className="material-symbols-outlined shrink-0 text-ggrey-2 opacity-0 group-hover/cell:opacity-100" style={{ fontSize: 13 }}>edit</span>
    </button>
  );
}
