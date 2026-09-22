/**
 * Generic list-table plumbing: sorting, multi-value filtering and free-text search.
 * Every table keeps its own columns and edit wiring; only the mechanics live here.
 * Filters are multi-value and travel as repeated query params (?stage=SALES&stage=CONTRACT).
 */

export type SortDir = "asc" | "desc";
/** What Next hands a page in `searchParams`: repeated keys arrive as arrays. */
export type QueryParams = Record<string, string | string[] | undefined>;

/** A URL's search params in the shape a page receives them, keeping repeated keys. */
export function queryParams(sp: URLSearchParams): QueryParams {
  const out: QueryParams = {};
  for (const key of new Set(sp.keys())) {
    const all = sp.getAll(key);
    out[key] = all.length > 1 ? all : all[0];
  }
  return out;
}

/** First value of a possibly-repeated query param. */
export function param(params: QueryParams, key: string): string | undefined {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

/** Every value of a possibly-repeated query param, blanks dropped. */
export function paramList(params: QueryParams, key: string): string[] {
  const v = params[key];
  return (Array.isArray(v) ? v : v === undefined ? [] : [v]).filter(Boolean);
}

/** Sort key and direction from the query string, falling back to the column's natural direction. */
export function parseSort<K extends string>(
  keys: readonly K[],
  defaultDir: Record<K, SortDir>,
  fallback: K,
  sort?: string,
  dir?: string,
): { sort: K; dir: SortDir } {
  const s = (keys as readonly string[]).includes(sort ?? "") ? (sort as K) : fallback;
  const d = dir === "asc" || dir === "desc" ? dir : defaultDir[s];
  return { sort: s, dir: d };
}

/** Stable-ish sort on a comparable value per row. */
export function sortRows<T, K extends string>(
  rows: T[],
  sort: K,
  dir: SortDir,
  valueOf: (row: T, key: K) => string | number,
): T[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = valueOf(a, sort), vb = valueOf(b, sort);
    return va < vb ? -sign : va > vb ? sign : 0;
  });
}

/** A list's sortable columns: which keys exist, how each sorts by default, and how to read its value. */
export type ListSort<T, K extends string> = {
  keys: readonly K[];
  defaultDir: Record<K, SortDir>;
  fallback: K;
  valueOf: (row: T, key: K) => string | number;
};

export const parseListSort = <T, K extends string>(cfg: ListSort<T, K>, sort?: string, dir?: string) =>
  parseSort(cfg.keys, cfg.defaultDir, cfg.fallback, sort, dir);

export const sortList = <T, K extends string>(rows: T[], cfg: ListSort<T, K>, sort: K, dir: SortDir) =>
  sortRows(rows, sort, dir, cfg.valueOf);

/** Lower-case and strip accents so "Əli" matches "əli" and "cafe" matches "café". */
export const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Joins searchable fields with a separator no term can span. */
export const haystack = (parts: (string | number | null | undefined)[]) => fold(parts.filter((p) => p != null).join(" \u0000 "));

/** Every whitespace-separated term must appear somewhere in the haystack. */
export function matchesSearch(hay: string, q: string): boolean {
  const terms = fold(q).split(/\s+/).filter(Boolean);
  return terms.every((t) => hay.includes(t));
}

export type MultiFilters<K extends string> = Record<K, string[]>;

/** Repeated query params into one array per filter key. */
export function parseMultiFilters<K extends string>(params: QueryParams, keys: readonly K[]): MultiFilters<K> {
  return Object.fromEntries(keys.map((k) => [k, paramList(params, k)])) as MultiFilters<K>;
}

export const hasFilters = <K extends string>(f: MultiFilters<K>, q?: string) =>
  !!q || Object.values<string[]>(f).some((v) => v.length > 0);

/** A row passes a key when that filter is empty or contains the row's value. */
export function applyFilters<T, K extends string>(
  rows: T[],
  filters: MultiFilters<K>,
  accessors: Record<K, (row: T) => string | null | undefined>,
): T[] {
  const active = (Object.keys(filters) as K[]).filter((k) => filters[k].length > 0);
  if (active.length === 0) return rows;
  return rows.filter((r) => active.every((k) => filters[k].includes(accessors[k](r) ?? "")));
}

/** Filters + sort as a query string, with repeated keys for multi-value filters. */
export function toQuery<K extends string>(
  filters: MultiFilters<K>,
  extra: Record<string, string | undefined> = {},
): URLSearchParams {
  const qs = new URLSearchParams();
  for (const [k, values] of Object.entries<string[]>(filters)) for (const v of values) qs.append(k, v);
  for (const [k, v] of Object.entries(extra)) if (v) qs.set(k, v);
  return qs;
}

/** Sorted unique values for a filter dropdown. */
export const distinct = (values: (string | null | undefined)[]) =>
  [...new Set(values.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b));
