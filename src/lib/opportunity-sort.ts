import { grossProfit } from "@/lib/domain/finance";
import { ORDER } from "@/lib/domain/lifecycle";
import { opportunityRef } from "@/lib/format";
import {
  applyFilters, haystack, matchesSearch, param, parseMultiFilters, parseSort as parseSortGeneric,
  sortRows, type MultiFilters, type QueryParams, type SortDir,
} from "@/lib/table";

export type { SortDir } from "@/lib/table";
export type SortKey = "ref" | "title" | "account" | "stage" | "status" | "revenue" | "margin" | "gp" | "accountable" | "modified";

const SORT_KEYS: SortKey[] = ["ref", "title", "account", "stage", "status", "revenue", "margin", "gp", "accountable", "modified"];

export const DEFAULT_DIR: Record<SortKey, SortDir> = {
  ref: "desc", title: "asc", account: "asc", stage: "asc", status: "asc", accountable: "asc",
  revenue: "desc", margin: "desc", gp: "desc", modified: "desc",
};

export function parseSort(sort?: string, dir?: string): { sort: SortKey; dir: SortDir } {
  return parseSortGeneric(SORT_KEYS, DEFAULT_DIR, "modified", sort, dir);
}

type SortableRow = {
  number: number; title: string; stage: string; description?: string | null; tags?: { tag: { label: string } }[];
  revenue: unknown; marginPct: unknown;
  account: { name: string }; accountable: { name: string }; status: { label: string } | null;
  lastModifiedAt: Date;
};

const valueOf = (r: SortableRow, sort: SortKey): string | number => {
  switch (sort) {
    case "ref": return r.number;
    case "title": return r.title.toLowerCase();
    case "account": return r.account.name.toLowerCase();
    case "stage": return ORDER.indexOf(r.stage as (typeof ORDER)[number]);
    case "status": return (r.status?.label ?? "").toLowerCase();
    case "accountable": return r.accountable.name.toLowerCase();
    case "revenue": return Number(r.revenue);
    case "margin": return Number(r.marginPct);
    case "gp": return grossProfit(Number(r.revenue), Number(r.marginPct));
    case "modified": return r.lastModifiedAt.getTime();
  }
};

export function sortOpportunities<T extends SortableRow>(rows: T[], sort: SortKey, dir: SortDir): T[] {
  return sortRows(rows, sort, dir, valueOf);
}

/** Filters shown as multiselect dropdowns; `q` is the free-text search. */
export const SELECT_FILTER_KEYS = ["stage", "status", "accountable", "account"] as const;
export type FilterKey = (typeof SELECT_FILTER_KEYS)[number];
/** Each key holds the selected values; an empty array means "all". */
export type Filters = Partial<MultiFilters<FilterKey>> & { q?: string };

const ACCESSORS: Record<FilterKey, (r: SortableRow) => string> = {
  stage: (r) => r.stage,
  status: (r) => r.status?.label ?? "",
  accountable: (r) => r.accountable.name,
  account: (r) => r.account.name,
};

/** Every whitespace-separated term must appear somewhere in the row. */
function matchesRow(r: SortableRow, q: string): boolean {
  return matchesSearch(
    haystack([
      opportunityRef(r.number), r.number, r.title, r.description, r.account.name, r.stage,
      r.status?.label, ...(r.tags ?? []).map((t) => t.tag.label), r.accountable.name,
    ]),
    q,
  );
}

export function parseFilters(params: QueryParams): Filters {
  return { ...parseMultiFilters(params, SELECT_FILTER_KEYS), q: param(params, "q") || undefined };
}

export const selected = (f: Filters, k: FilterKey): string[] => f[k] ?? [];

export const hasActiveFilters = (f: Filters) => !!f.q || SELECT_FILTER_KEYS.some((k) => selected(f, k).length > 0);

export function filterOpportunities<T extends SortableRow>(rows: T[], f: Filters): T[] {
  const narrowed = applyFilters(rows, Object.fromEntries(SELECT_FILTER_KEYS.map((k) => [k, selected(f, k)])) as MultiFilters<FilterKey>, ACCESSORS);
  return f.q ? narrowed.filter((r) => matchesRow(r, f.q!)) : narrowed;
}

/** Filters as repeated query params, ready to carry across sort links and exports. */
export function filtersToQuery(f: Filters, extra: Record<string, string | undefined> = {}): URLSearchParams {
  const qs = new URLSearchParams();
  for (const k of SELECT_FILTER_KEYS) for (const v of selected(f, k)) qs.append(k, v);
  if (f.q) qs.set("q", f.q);
  for (const [k, v] of Object.entries(extra)) if (v) qs.set(k, v);
  return qs;
}
