"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MultiSelect, type Option } from "@/components/ui/MultiSelect";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export type FilterDef = { key: string; label: string; allLabel: string; options: Option[] };

/**
 * Search box plus multiselect dropdowns for a list page. Filters live in the URL, like sorting,
 * so links and reloads keep them; several values of one filter repeat the key.
 */
export type DateRange = { from?: string; to?: string };

export function TableFilterBar({ pathname, q, searchLabel, searchPlaceholder, filters, defs, dates, month, keep = {}, children }: {
  pathname: string;
  /** Omit to hide the search box. */
  q?: string;
  searchLabel?: string;
  searchPlaceholder?: string;
  filters: Record<string, string[]>;
  defs: FilterDef[];
  /** Adds From/To date inputs; omit for lists with no date range. */
  dates?: DateRange;
  /** Adds a single month picker ("YYYY-MM"); omit where no month applies. */
  month?: { value: string; label: string };
  /** Query params to carry across filter changes, e.g. sort and page size. */
  keep?: Record<string, string>;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const searchable = q !== undefined;
  const [text, setText] = useState(q ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const active = !!q || !!dates?.from || !!dates?.to || defs.some((d) => (filters[d.key] ?? []).length > 0);

  function go(next: Record<string, string[]>, search: string | undefined, range: DateRange = dates ?? {}, replace = false) {
    const qs = new URLSearchParams(keep);
    if (month) qs.set("month", month.value);
    for (const d of defs) {
      qs.delete(d.key);
      for (const v of next[d.key] ?? []) qs.append(d.key, v);
    }
    for (const k of ["from", "to"] as const) {
      if (range[k]) qs.set(k, range[k]!);
      else qs.delete(k);
    }
    if (search) qs.set("q", search);
    else qs.delete("q");
    const url = `${pathname}?${qs}`;
    if (replace) router.replace(url);
    else router.push(url);
  }

  // Typing updates the URL after a short pause, replacing history so each keystroke isn't a back-button step.
  function onSearch(value: string) {
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => go(filters, value.trim() || undefined, dates ?? {}, true), 300);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {searchable && (
        <label className="relative">
          <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ggrey-2" style={{ fontSize: 18 }}>search</span>
          <input
            type="search"
            aria-label={searchLabel ?? "Search"}
            placeholder={searchPlaceholder ?? "Search…"}
            value={text}
            onChange={(e) => onSearch(e.target.value)}
            className="h-9 w-64 rounded-md border border-gline bg-gsurface pl-8 pr-2.5 text-[13px] text-gink outline-none transition-colors hover:border-ggrey-2 focus:border-gblue focus:ring-2 focus:ring-gblue/25"
          />
        </label>
      )}
      {defs.map((d) => (
        <MultiSelect
          key={d.key}
          label={d.label}
          allLabel={d.allLabel}
          options={d.options}
          selected={filters[d.key] ?? []}
          onChange={(values) => go({ ...filters, [d.key]: values }, q)}
        />
      ))}
      {month && (
        <label className="flex items-center gap-1.5 text-xs text-ggrey">
          {month.label}
          <input
            type="month"
            aria-label={month.label}
            value={month.value}
            onChange={(e) => {
              if (!e.target.value) return;
              const qs = new URLSearchParams(keep);
              for (const d of defs) {
                qs.delete(d.key);
                for (const v of filters[d.key] ?? []) qs.append(d.key, v);
              }
              qs.set("month", e.target.value);
              router.push(`${pathname}?${qs}`);
            }}
            className="h-9 rounded-md border border-gline bg-gsurface px-2 text-[13px] text-gink outline-none transition-colors hover:border-ggrey-2 focus:border-gblue focus:ring-2 focus:ring-gblue/25"
          />
        </label>
      )}
      {dates && (["from", "to"] as const).map((k) => (
        <label key={k} className="flex items-center gap-1.5 text-xs capitalize text-ggrey">
          {k}
          <input
            type="date"
            aria-label={`${k === "from" ? "From" : "To"} date`}
            value={dates[k] ?? ""}
            onChange={(e) => go(filters, q, { ...dates, [k]: e.target.value || undefined })}
            className="h-9 rounded-md border border-gline bg-gsurface px-2 text-[13px] text-gink outline-none transition-colors hover:border-ggrey-2 focus:border-gblue focus:ring-2 focus:ring-gblue/25"
          />
        </label>
      ))}
      {children}
      {active && (
        <Button variant="ghost" onClick={() => { setText(""); go({}, undefined, {}); }}>
          <Icon name="filter_alt_off" />
          Clear
        </Button>
      )}
    </div>
  );
}
