"use client";
import { useEffect } from "react";

const KEY = "opp-col-widths";
type Widths = Record<string, number>;

function load(): Widths | null {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch { return null; }
}
function save(w: Widths) {
  try { localStorage.setItem(KEY, JSON.stringify(w)); } catch {}
}

/** Switch a table to fixed layout with every header pinned to an explicit pixel width. */
function freeze(table: HTMLTableElement, widths?: Widths | null) {
  const ths = Array.from(table.querySelectorAll<HTMLTableCellElement>("thead th"));
  let total = 0;
  for (const th of ths) {
    const w = widths?.[th.dataset.col ?? ""] ?? th.offsetWidth;
    th.style.width = `${w}px`;
    total += w;
  }
  table.style.tableLayout = "fixed";
  table.style.width = `${total}px`;
}

/** Applies saved widths once on mount. Render inside the table wrapper, before the table. */
export function RestoreColumnWidths() {
  useEffect(() => {
    const saved = load();
    const table = document.querySelector<HTMLTableElement>("table[data-resizable]");
    if (saved && table) freeze(table, saved);
  }, []);
  return null;
}

// ponytail: widths keyed by column label via data-col; renaming a column just drops its saved width.
/** Drag handle for the right edge of a <th data-col>. Works on the DOM directly — no React state. */
export function ColResizer() {
  function onPointerDown(e: React.PointerEvent<HTMLSpanElement>) {
    const th = e.currentTarget.closest("th")!;
    const table = th.closest("table")!;
    if (table.style.tableLayout !== "fixed") freeze(table);
    const startX = e.clientX, startW = th.offsetWidth, startT = table.offsetWidth;
    const move = (ev: PointerEvent) => {
      const w = Math.max(40, startW + ev.clientX - startX);
      th.style.width = `${w}px`;
      table.style.width = `${startT + w - startW}px`;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const widths: Widths = {};
      for (const h of table.querySelectorAll<HTMLTableCellElement>("thead th")) widths[h.dataset.col ?? ""] = h.offsetWidth;
      save(widths);
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
