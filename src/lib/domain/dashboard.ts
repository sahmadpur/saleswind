import type { Stage } from "@prisma/client";
import { grossProfit } from "@/lib/domain/finance";
import { ORDER } from "@/lib/domain/lifecycle";

/** What "current work" means on the dashboard: everything that is neither finished nor dropped. */
export const OPEN_STATUS_LABELS = ["In Progress", "Pending", "Not Started"] as const;
/** The four outcomes the monthly report tracks, one chart each. */
export const MONTHLY_STATUS_LABELS = ["Cancelled", "Pending", "Delayed", "Implemented"] as const;

export type DashboardRow = {
  stage: Stage;
  revenue: number;
  marginPct: number;
  statusLabel: string | null;
  accountable: string;
  /** Used for the current-month window. */
  lastModifiedAt: Date;
  /** When the status last changed; null for rows created before the column existed. */
  statusChangedAt: Date | null;
};

export type StageCount = { stage: Stage; label: string; count: number; gp: number; revenue: number };

const monthOf = (d: Date) => d.toISOString().slice(0, 7);

/** "YYYY-MM" for the month a date falls in, in UTC — the same bucketing the charts label. */
export const toMonth = monthOf;

/** The current month as "YYYY-MM". */
export const currentMonth = (now = new Date()) => monthOf(now);

export const isOpen = (r: DashboardRow) => !!r.statusLabel && (OPEN_STATUS_LABELS as readonly string[]).includes(r.statusLabel);

/** Rows whose last edit falls inside the given "YYYY-MM". */
export const inMonth = (rows: DashboardRow[], month: string) => rows.filter((r) => monthOf(r.lastModifiedAt) === month);

/**
 * Count, revenue and gross profit per stage. Every stage is always present, so a
 * chart keeps its four bars even when a stage is empty.
 */
export function byStage(rows: DashboardRow[]): StageCount[] {
  return ORDER.map((stage) => {
    const of = rows.filter((r) => r.stage === stage);
    return {
      stage,
      label: stage.charAt(0) + stage.slice(1).toLowerCase(),
      count: of.length,
      revenue: of.reduce((sum, r) => sum + r.revenue, 0),
      gp: of.reduce((sum, r) => sum + grossProfit(r.revenue, r.marginPct), 0),
    };
  });
}

/** One entry per accountable that still has rows, ordered by name. */
export function byAccountable(rows: DashboardRow[]): { name: string; stages: StageCount[]; count: number; gp: number }[] {
  const names = [...new Set(rows.map((r) => r.accountable))].sort((a, b) => a.localeCompare(b));
  return names.map((name) => {
    const of = rows.filter((r) => r.accountable === name);
    const stages = byStage(of);
    return { name, stages, count: of.length, gp: stages.reduce((sum, s) => sum + s.gp, 0) };
  });
}

/**
 * How many opportunities entered a status each month, oldest first.
 * Buckets on statusChangedAt; rows that never recorded one are skipped rather than
 * silently attributed to the wrong month.
 */
export function monthlyByStatus(rows: DashboardRow[], label: string, months: number, now = new Date()): { month: string; count: number }[] {
  const buckets = new Map<string, number>();
  for (let i = months - 1; i >= 0; i--) {
    buckets.set(monthOf(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))), 0);
  }
  for (const r of rows) {
    if (r.statusLabel !== label || !r.statusChangedAt) continue;
    const m = monthOf(r.statusChangedAt);
    if (buckets.has(m)) buckets.set(m, buckets.get(m)! + 1);
  }
  return [...buckets].map(([month, count]) => ({ month, count }));
}

export const totals = (rows: DashboardRow[]) => ({
  count: rows.length,
  revenue: rows.reduce((sum, r) => sum + r.revenue, 0),
  gp: rows.reduce((sum, r) => sum + grossProfit(r.revenue, r.marginPct), 0),
});
