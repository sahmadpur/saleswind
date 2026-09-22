import "server-only";
import type { Prisma, Stage } from "@prisma/client";
import { db } from "@/lib/db";
import { ORDER } from "@/lib/domain/lifecycle";
import { grossProfit } from "@/lib/domain/finance";
import type { DashboardRow } from "@/lib/domain/dashboard";

export interface StageSummary { stage: Stage; count: number; revenue: number; grossProfit: number; }

/** Pipeline totals per stage, cancelled work excluded. Still used by the export route. */
export async function pipelineSummary(): Promise<StageSummary[]> {
  const opps = await db.opportunity.findMany({ where: { NOT: { status: { is: { label: "Cancelled" } } } }, select: { stage: true, revenue: true, marginPct: true } });
  return ORDER.map((stage) => {
    const rows = opps.filter((o) => o.stage === stage);
    const revenue = rows.reduce((sum, o) => sum + Number(o.revenue), 0);
    const grossProfitTotal = rows.reduce((sum, o) => sum + grossProfit(Number(o.revenue), Number(o.marginPct)), 0);
    return { stage, count: rows.length, revenue, grossProfit: grossProfitTotal };
  });
}

export type DashboardFilters = { accountable: string[]; status: string[] };

/**
 * Every opportunity the dashboard charts, narrowed by the page's filters and flattened
 * to plain numbers. All bucketing and summing happens in src/lib/domain/dashboard.ts,
 * which keeps the maths pure and testable. Unlike pipelineSummary this does not drop
 * cancelled work: the dashboard filters by status explicitly, and the monthly report needs it.
 */
export async function dashboardRows(filters: DashboardFilters): Promise<DashboardRow[]> {
  const where: Prisma.OpportunityWhereInput = {
    ...(filters.accountable.length > 0 && { accountable: { is: { name: { in: filters.accountable } } } }),
    ...(filters.status.length > 0 && { status: { is: { label: { in: filters.status } } } }),
  };
  const rows = await db.opportunity.findMany({
    where,
    select: {
      stage: true, revenue: true, marginPct: true, lastModifiedAt: true, statusChangedAt: true,
      status: { select: { label: true } },
      accountable: { select: { name: true } },
    },
  });
  return rows.map((o) => ({
    stage: o.stage,
    revenue: Number(o.revenue),
    marginPct: Number(o.marginPct),
    statusLabel: o.status?.label ?? null,
    accountable: o.accountable.name,
    lastModifiedAt: o.lastModifiedAt,
    statusChangedAt: o.statusChangedAt,
  }));
}

/** Filter dropdown options: every accountable and every status label in use. */
export async function dashboardFilterOptions() {
  const [users, statuses] = await Promise.all([
    db.user.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
    db.status.findMany({ select: { label: true }, distinct: ["label"], orderBy: { label: "asc" } }),
  ]);
  return { accountable: users.map((u) => u.name), status: statuses.map((s) => s.label) };
}

export async function opportunitiesForExport() {
  return db.opportunity.findMany({
    include: { account: true, accountable: true, status: true, tags: { include: { tag: true } } },
    orderBy: { createdAt: "desc" },
  });
}
