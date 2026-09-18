"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { STATUS_COLORS, statusColor, type StatusColor } from "@/lib/status-colors";
import { deleteStatusAction, setStatusColorAction, toggleStatusAction } from "@/actions/dictionary-actions";
import { DictionaryDeleteButton } from "@/components/dictionary/DictionaryDeleteButton";

/** Dictionary status: click the label to toggle active, the swatch to pick a colour, × to delete. */
export function StatusChip({ id, label, color, isActive }: { id: string; label: string; color: string; isActive: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const c = statusColor(color);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative inline-flex items-center rounded-md text-xs font-medium", isActive ? c.wrap : "bg-ghover text-ggrey-2", pending && "opacity-60")}>
      <button
        type="button"
        aria-label={`Colour of ${label}`}
        onClick={() => setOpen((o) => !o)}
        className="grid h-7 w-6 place-items-center rounded-l-md hover:bg-black/5"
      >
        <span className={cn("h-2.5 w-2.5 rounded-full", c.dot)} />
      </button>
      <button
        type="button"
        title={isActive ? "Click to deactivate" : "Click to activate"}
        onClick={() => start(() => toggleStatusAction(id))}
        className={cn("h-7 pl-1 pr-1 hover:bg-black/5", !isActive && "line-through")}
      >
        {label}
      </button>
      <DictionaryDeleteButton
        action={() => deleteStatusAction(id)}
        label={label}
        confirmText={`Delete status "${label}"?`}
        className="rounded-r-md hover:bg-black/5"
      />
      {open && (
        <div className="g-pop absolute left-0 top-full z-20 mt-1 flex gap-1.5 rounded-md border border-gline-2 bg-gsurface p-2 shadow-g2">
          {(Object.keys(STATUS_COLORS) as StatusColor[]).map((k) => (
            <button
              key={k}
              type="button"
              title={STATUS_COLORS[k].label}
              aria-label={STATUS_COLORS[k].label}
              onClick={() => { setOpen(false); start(() => setStatusColorAction(id, k)); }}
              className={cn("h-5 w-5 rounded-full ring-offset-2", STATUS_COLORS[k].dot, k === color && "ring-2 ring-gink")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
