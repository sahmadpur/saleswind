import { grossProfit } from "@/lib/domain/finance";
import { ORDER } from "@/lib/domain/lifecycle";

export type SortKey = "ref" | "title" | "account" | "stage" | "status" | "revenue" | "margin" | "gp" | "accountable" | "modified";
export type SortDir = "asc" | "desc";

const SORT_KEYS: SortKey[] = ["ref", "title", "account", "stage", "status", "revenue", "margin", "gp", "accountable", "modified"];

export const DEFAULT_DIR: Record<SortKey, SortDir> = {
  ref: "desc", title: "asc", account: "asc", stage: "asc", status: "asc", accountable: "asc",
  revenue: "desc", margin: "desc", gp: "desc", modified: "desc",
};

export function parseSort(sort?: string, dir?: string): { sort: SortKey; dir: SortDir } {
  const s = (SORT_KEYS as string[]).includes(sort ?? "") ? (sort as SortKey) : "modified";
  const d = dir === "asc" || dir === "desc" ? dir : DEFAULT_DIR[s];
  return { sort: s, dir: d };
}

type SortableRow = {
  number: number; title: string; stage: string;
  revenue: unknown; marginPct: unknown;
  account: { name: string }; accountable: { name: string }; status: { label: string } | null;
  lastModifiedAt: Date;
};

export function sortOpportunities<T extends SortableRow>(rows: T[], sort: SortKey, dir: SortDir): T[] {
  const val = (r: T): string | number => {
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
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = val(a), vb = val(b);
    return va < vb ? -sign : va > vb ? sign : 0;
  });
}

export const FILTER_KEYS = ["stage", "status", "accountable", "account"] as const;
export type Filters = Partial<Record<(typeof FILTER_KEYS)[number], string>>;

export function parseFilters(q: Record<string, string | undefined>): Filters {
  const f: Filters = {};
  for (const k of FILTER_KEYS) if (q[k]) f[k] = q[k];
  return f;
}

export function filterOpportunities<T extends SortableRow>(rows: T[], f: Filters): T[] {
  return rows.filter(
    (r) =>
      (!f.stage || r.stage === f.stage) &&
      (!f.status || r.status?.label === f.status) &&
      (!f.accountable || r.accountable.name === f.accountable) &&
      (!f.account || r.account.name === f.account),
  );
}
