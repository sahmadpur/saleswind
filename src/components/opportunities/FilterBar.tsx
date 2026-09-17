"use client";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { FILTER_KEYS, type Filters } from "@/lib/opportunity-sort";

type Options = Record<keyof Filters, string[]>;
const LABELS: Record<keyof Filters, [string, string]> = {
  stage: ["Stage", "All stages"], status: ["Status", "All statuses"], accountable: ["Accountable", "All accountables"], account: ["Account", "All accounts"],
};

/** Filter selects for the opportunities table. Filters live in the URL, like sorting, so links and reloads keep them. */
export function FilterBar({ filters, options, query }: { filters: Filters; options: Options; query: Record<string, string> }) {
  const router = useRouter();
  const active = FILTER_KEYS.some((k) => filters[k]);

  function go(next: Filters) {
    const qs = new URLSearchParams(query);
    for (const k of FILTER_KEYS) {
      if (next[k]) qs.set(k, next[k]);
      else qs.delete(k);
    }
    router.push(`/opportunities?${qs}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {FILTER_KEYS.map((k) => (
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
            <option key={v} value={v}>{k === "stage" ? v.charAt(0) + v.slice(1).toLowerCase() : v}</option>
          ))}
        </Select>
      ))}
      {active && (
        <Button variant="ghost" onClick={() => go({})}>
          <Icon name="close" />
          Clear
        </Button>
      )}
    </div>
  );
}
