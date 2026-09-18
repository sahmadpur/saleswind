"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Chip } from "@/components/ui/Chip";
import { attachTagAction, detachTagAction } from "@/actions/opportunity-actions";
import { cn } from "@/lib/cn";

type Tag = { value: string; label: string };

/**
 * Tags cell with a checkbox popover. Each toggle saves immediately.
 * The popover is portalled with fixed positioning so the table's overflow container can't clip it.
 */
export function TagCell({ opportunityId, attached, options }: {
  opportunityId: string;
  attached: { id: string; label: string }[];
  options: Tag[];
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [selected, setSelected] = useState(() => new Set(attached.map((t) => t.id)));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Resync with server data when a save revalidates the page, without closing the popover.
  const attachedKey = attached.map((t) => t.id).join(",");
  const [syncedKey, setSyncedKey] = useState(attachedKey);
  if (attachedKey !== syncedKey) {
    setSyncedKey(attachedKey);
    setSelected(new Set(attached.map((t) => t.id)));
  }

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onScroll = (e: Event) => { if (!panelRef.current?.contains(e.target as Node)) setOpen(false); };
    const onResize = () => setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  function toggleOpen() {
    if (open) { setOpen(false); return; }
    const r = triggerRef.current!.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: Math.min(r.left, window.innerWidth - 232) });
    setError(null);
    setOpen(true);
  }

  function toggle(tagId: string) {
    const on = !selected.has(tagId);
    const next = new Set(selected);
    if (on) next.add(tagId); else next.delete(tagId);
    setSelected(next);
    start(async () => {
      const res = await (on ? attachTagAction : detachTagAction)(opportunityId, tagId);
      if (res.error) {
        setError(res.error);
        setSelected((s) => {
          const back = new Set(s);
          if (on) back.delete(tagId); else back.add(tagId);
          return back;
        });
      }
    });
  }

  // Inactive tags stay visible (and removable) while attached.
  const known = new Map(options.map((o) => [o.value, o.label]));
  for (const t of attached) if (!known.has(t.id)) known.set(t.id, t.label);
  const shown = [...known].filter(([id]) => selected.has(id));

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title="Edit tags"
        aria-label="Edit tags"
        aria-expanded={open}
        onClick={toggleOpen}
        className={cn(
          "group/cell relative -mx-1 flex min-h-6 w-[calc(100%+0.5rem)] min-w-0 flex-wrap items-center gap-1 rounded px-1 py-0.5 text-left transition-colors hover:bg-gsurface hover:ring-1 hover:ring-gline",
          open && "bg-gsurface ring-1 ring-gblue",
        )}
      >
        {shown.length === 0 && <span className="text-ggrey-2">—</span>}
        {shown.map(([id, label]) => <Chip key={id} label={label} className="max-w-28" />)}
        <span
          className="material-symbols-outlined pointer-events-none absolute right-0.5 top-1/2 -translate-y-1/2 rounded bg-gsurface px-0.5 text-ggrey-2 opacity-0 group-hover/cell:opacity-100"
          style={{ fontSize: 13 }}
        >
          edit
        </span>
      </button>
      {open && pos && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Tags"
          // React events bubble through portals; keep clicks from reaching the row link.
          onClick={(e) => e.stopPropagation()}
          style={{ top: pos.top, left: pos.left }}
          className={cn("fixed z-50 w-56 rounded-md border border-gline bg-gsurface py-1 shadow-g2", pending && "opacity-80")}
        >
          {known.size === 0 && <p className="px-3 py-2 text-xs text-ggrey">No tags for this stage</p>}
          <ul className="max-h-64 overflow-y-auto">
            {[...known].map(([id, label]) => (
              <li key={id}>
                <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[13px] text-gink hover:bg-ghover">
                  <input type="checkbox" checked={selected.has(id)} onChange={() => toggle(id)} className="accent-gblue" />
                  <span className="truncate">{label}</span>
                </label>
              </li>
            ))}
          </ul>
          {error && <p role="alert" className="border-t border-gline-2 px-3 py-1.5 text-[11px] font-medium text-gred">{error}</p>}
        </div>,
        document.body,
      )}
    </>
  );
}
