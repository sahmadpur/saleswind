"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { FILTER_KEYS, SELECT_FILTER_KEYS, type Filters } from "@/lib/opportunity-sort";
import { shortName } from "@/lib/format";

type SelectKey = (typeof SELECT_FILTER_KEYS)[number];
type Options = Record<SelectKey, string[]>;
const LABELS: Record<SelectKey, [string, string]> = {
  stage: ["Stage", "All stages"], status: ["Status", "All statuses"], accountable: ["Accountable", "All accountables"], account: ["Account", "All accounts"],
};

/** Filter selects for the opportunities table. Filters live in the URL, like sorting, so links and reloads keep them. */
export function FilterBar({ filters, options, query }: { filters: Filters; options: Options; query: Record<string, string> }) {
  const router = useRouter();
  const active = FILTER_KEYS.some((k) => filters[k]);
  const [text, setText] = useState(filters.q ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  function go(next: Filters, replace = false) {
    const qs = new URLSearchParams(query);
    for (const k of FILTER_KEYS) {
      if (next[k]) qs.set(k, next[k]);
      else qs.delete(k);
    }
    const url = `/opportunities?${qs}`;
    if (replace) router.replace(url);
    else router.push(url);
  }

  // Typing updates the URL after a short pause, replacing history so each keystroke isn't a back-button step.
  function onSearch(value: string) {
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => go({ ...filters, q: value.trim() || undefined }, true), 300);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative">
        <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ggrey-2" style={{ fontSize: 18 }}>search</span>
        <input
          type="search"
          aria-label="Search opportunities"
          placeholder="Search opportunities…"
          value={text}
          onChange={(e) => onSearch(e.target.value)}
          className="h-9 w-64 rounded-md border border-gline bg-gsurface pl-8 pr-2.5 text-[13px] text-gink outline-none transition-colors hover:border-ggrey-2 focus:border-gblue focus:ring-2 focus:ring-gblue/25"
        />
      </label>
      {SELECT_FILTER_KEYS.map((k) => (
        <Select
          key={k}
          aria-label={LABELS[k][0]}
          value={filters[k] ?? ""}
          onChange={(e) => go({ ...filters, [k]: e.target.value })}
          className="h-9 min-w-40 text-[13px]"
          style={{ width: "auto" }}
        >
          <option value="">{LABELS[k][1]}</option>
          {options[k].map((v) => (
            <option key={v} value={v}>{k === "stage" ? v.charAt(0) + v.slice(1).toLowerCase() : k === "accountable" ? shortName(v) : v}</option>
          ))}
        </Select>
      ))}
      {active && (
        <Button variant="ghost" onClick={() => { clearTimeout(timer.current); setText(""); go({}); }}>
          <Icon name="close" />
          Clear
        </Button>
      )}
    </div>
  );
}
