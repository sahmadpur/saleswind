"use client";
import { TableFilterBar } from "@/components/ui/TableFilterBar";
import { SELECT_FILTER_KEYS, selected, type FilterKey, type Filters } from "@/lib/opportunity-sort";

type Options = Record<FilterKey, { value: string; label: string }[]>;
const LABELS: Record<FilterKey, [string, string]> = {
  stage: ["Stage", "All stages"], status: ["Status", "All statuses"], accountable: ["Accountable", "All accountables"], account: ["Account", "All accounts"],
};

/** Filters for the opportunities table: free-text search plus one multiselect per column. */
export function FilterBar({ filters, options, query }: { filters: Filters; options: Options; query: Record<string, string> }) {
  return (
    <TableFilterBar
      pathname="/opportunities"
      q={filters.q ?? ""}
      searchLabel="Search opportunities"
      searchPlaceholder="Search opportunities…"
      filters={Object.fromEntries(SELECT_FILTER_KEYS.map((k) => [k, selected(filters, k)]))}
      defs={SELECT_FILTER_KEYS.map((k) => ({ key: k, label: LABELS[k][0], allLabel: LABELS[k][1], options: options[k] }))}
      keep={query}
    />
  );
}
