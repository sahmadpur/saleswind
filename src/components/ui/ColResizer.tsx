"use client";
import { useEffect, useState } from "react";

type Widths = Record<string, number>;
const MIN = 40;

// Widths are saved per table, so every list in the app can be resized independently.
const storageKey = (scope: string) => `col-widths:${scope}`;
const selector = (scope: string) => `table[data-resizable="${scope}"]`;

function load(scope: string): Widths | null {
  try { return JSON.parse(localStorage.getItem(storageKey(scope)) ?? "null"); } catch { return null; }
}
// Lets the reset button know whether custom widths exist.
const CHANGE_EVENT = "col-widths-change";

function save(scope: string, w: Widths | null) {
  try {
    if (w) localStorage.setItem(storageKey(scope), JSON.stringify(w));
    else localStorage.removeItem(storageKey(scope));
  } catch {}
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: scope }));
}

// Chosen (unstretched) widths per resizable table, once it has switched to fixed layout.
const chosen = new WeakMap<HTMLTableElement, Widths>();

const headers = (table: HTMLTableElement) => Array.from(table.querySelectorAll<HTMLTableCellElement>("thead th"));
const colOf = (th: HTMLTableCellElement) => th.dataset.col ?? "";
const scopeOf = (table: HTMLTableElement) => table.dataset.resizable ?? "";

/**
 * Pin every header to its chosen pixel width in fixed layout. If the columns add up to less than
 * the visible area, the last column stretches to fill it (its chosen width is kept as the minimum).
 */
function apply(table: HTMLTableElement, widths: Widths) {
  const ths = headers(table);
  if (ths.length === 0) return;
  const available = table.parentElement?.clientWidth ?? 0;
  const last = ths[ths.length - 1];
  let others = 0;
  for (const th of ths.slice(0, -1)) {
    const w = widths[colOf(th)] ?? th.offsetWidth;
    th.style.width = `${w}px`;
    others += w;
  }
  const lastW = Math.max(widths[colOf(last)] ?? last.offsetWidth, available - others, MIN);
  last.style.width = `${lastW}px`;
  table.style.tableLayout = "fixed";
  table.style.width = `${others + lastW}px`;
  chosen.set(table, widths);
}

/** Current widths as the starting point for fixed layout. */
function measure(table: HTMLTableElement): Widths {
  // offsetWidth rounds fractional widths down, which would clip content once pinned.
  return Object.fromEntries(headers(table).map((th) => [colOf(th), Math.ceil(th.getBoundingClientRect().width)]));
}

/** Applies saved widths on mount and keeps the last column filling the space when the page resizes. */
export function RestoreColumnWidths({ scope }: { scope: string }) {
  useEffect(() => {
    const table = document.querySelector<HTMLTableElement>(selector(scope));
    if (!table?.parentElement) return;
    const saved = load(scope);
    if (saved) apply(table, saved);
    const observer = new ResizeObserver(() => {
      const w = chosen.get(table);
      if (w) apply(table, w);
    });
    observer.observe(table.parentElement);
    return () => observer.disconnect();
  }, [scope]);
  return null;
}

/** Clears saved widths and returns the table to automatic layout. Disabled until a column was resized. */
export function ResetColumnWidths({ scope, className }: { scope: string; className?: string }) {
  const [custom, setCustom] = useState(false);
  useEffect(() => {
    const sync = (e?: Event) => {
      if (e instanceof CustomEvent && e.detail && e.detail !== scope) return;
      setCustom(!!load(scope));
    };
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, [scope]);

  function reset() {
    const table = document.querySelector<HTMLTableElement>(selector(scope));
    if (table) {
      chosen.delete(table);
      for (const th of headers(table)) th.style.width = "";
      table.style.tableLayout = "";
      table.style.width = "";
    }
    save(scope, null);
  }

  return (
    <button
      type="button"
      onClick={reset}
      disabled={!custom}
      title={custom ? "Reset column widths" : "Drag a column edge to resize; reset appears here"}
      className={className}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>restart_alt</span>
      Reset columns
    </button>
  );
}

// ponytail: widths keyed by column label via data-col; renaming a column just drops its saved width.
/** Drag handle for the right edge of a <th data-col>. Works on the DOM directly — no React state. */
export function ColResizer() {
  function onPointerDown(e: React.PointerEvent<HTMLSpanElement>) {
    const th = e.currentTarget.closest("th")!;
    const table = th.closest("table")!;
    const widths = { ...(chosen.get(table) ?? measure(table)) };
    const col = colOf(th);
    // Start from what is on screen, so dragging a stretched last column doesn't jump.
    const startX = e.clientX, startW = th.offsetWidth;
    const move = (ev: PointerEvent) => {
      widths[col] = Math.max(MIN, startW + ev.clientX - startX);
      apply(table, widths);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      save(scopeOf(table), widths);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    e.preventDefault();
  }
  return (
    <span
      onPointerDown={onPointerDown}
      onClick={(e) => e.stopPropagation()}
      title="Drag to resize column"
      className="absolute top-0 right-0 flex h-full w-2 cursor-col-resize select-none items-center justify-end"
      aria-hidden
    >
      <span className="h-3.5 w-px bg-gline transition-colors [th:hover_&]:bg-ggrey-2 [th:hover_&]:w-0.5" />
    </span>
  );
}
