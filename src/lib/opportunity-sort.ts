import { grossProfit } from "@/lib/domain/finance";
import { monthLabel } from "@/lib/format";

export type SortKey = "ref" | "title" | "account" | "revenue" | "margin" | "gp" | "accountable" | "created" | "modified";
export type SortDir = "asc" | "desc";

const SORT_KEYS: SortKey[] = ["ref", "title", "account", "revenue", "margin", "gp", "accountable", "created", "modified"];

export const DEFAULT_DIR: Record<SortKey, SortDir> = {
  ref: "desc", title: "asc", account: "asc", accountable: "asc",
  revenue: "desc", margin: "desc", gp: "desc", created: "desc", modified: "desc",
};

export function parseSort(sort?: string, dir?: string): { sort: SortKey; dir: SortDir } {
  const s = (SORT_KEYS as string[]).includes(sort ?? "") ? (sort as SortKey) : "created";
  const d = dir === "asc" || dir === "desc" ? dir : DEFAULT_DIR[s];
  return { sort: s, dir: d };
}

type SortableRow = {
  number: number; title: string; isCancelled: boolean;
  revenue: unknown; marginPct: unknown;
  account: { name: string }; accountable: { name: string };
  createdAt: Date; lastModifiedAt: Date;
};

export function sortOpportunities<T extends SortableRow>(rows: T[], sort: SortKey, dir: SortDir): T[] {
  const val = (r: T): string | number => {
    switch (sort) {
      case "ref": return r.number;
      case "title": return r.title.toLowerCase();
      case "account": return r.account.name.toLowerCase();
      case "accountable": return r.accountable.name.toLowerCase();
      case "revenue": return Number(r.revenue);
      case "margin": return Number(r.marginPct);
      case "gp": return grossProfit(Number(r.revenue), Number(r.marginPct));
      case "created": return r.createdAt.getTime();
      case "modified": return r.lastModifiedAt.getTime();
    }
  };
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = val(a), vb = val(b);
    return va < vb ? -sign : va > vb ? sign : 0;
  });
}

export type MonthGroup<T> = { key: string; label: string; rows: T[]; count: number; revenue: number; gp: number };

/** Group created-sorted rows into month sections. Money totals exclude cancelled rows (matching the page stats). */
export function groupByMonth<T extends SortableRow>(rows: T[]): MonthGroup<T>[] {
  const groups: MonthGroup<T>[] = [];
  let current: MonthGroup<T> | null = null;
  for (const r of rows) {
    const key = `${r.createdAt.getFullYear()}-${r.createdAt.getMonth()}`;
    if (!current || current.key !== key) {
      current = { key, label: monthLabel(r.createdAt), rows: [], count: 0, revenue: 0, gp: 0 };
      groups.push(current);
    }
    current.rows.push(r);
    current.count += 1;
    if (!r.isCancelled) {
      current.revenue += Number(r.revenue);
      current.gp += grossProfit(Number(r.revenue), Number(r.marginPct));
    }
  }
  return groups;
}
