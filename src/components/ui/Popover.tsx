"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

/**
 * Button plus a panel anchored under it. The panel is portalled with fixed positioning,
 * so a table's overflow container can't clip it; it closes on outside click, Escape, scroll or resize.
 * The trigger lives here (rather than at the call site) to keep the refs out of callers' render.
 */
export function Popover({ label, width, trigger, triggerClassName, triggerTitle, panelClassName, onOpen, children }: {
  /** Accessible name for both the trigger and the panel. */
  label: string;
  width: number;
  /** Trigger contents; receives whether the panel is open. */
  trigger: (open: boolean) => React.ReactNode;
  triggerClassName: (open: boolean) => string;
  triggerTitle?: string;
  panelClassName?: string;
  onOpen?: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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

  function toggle() {
    if (open) { setOpen(false); return; }
    const r = triggerRef.current!.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: Math.min(r.left, window.innerWidth - width - 8) });
    onOpen?.();
    setOpen(true);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title={triggerTitle ?? label}
        aria-label={label}
        aria-expanded={open}
        onClick={toggle}
        className={triggerClassName(open)}
      >
        {trigger(open)}
      </button>
      {open && pos && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label={label}
          // React events bubble through portals; keep clicks from reaching the row link.
          onClick={(e) => e.stopPropagation()}
          style={{ top: pos.top, left: pos.left, width }}
          className={cn("fixed z-50 rounded-md border border-gline bg-gsurface py-1 shadow-g2", panelClassName)}
        >
          {children}
        </div>,
        document.body,
      )}
    </>
  );
}
