import "server-only";
import { db } from "@/lib/db";
import { ORDER } from "@/lib/domain/lifecycle";
import { grossProfit } from "@/lib/domain/finance";
import type { State } from "@prisma/client";

export interface StateSummary { state: State; count: number; revenue: number; grossProfit: number; }

export async function pipelineSummary(): Promise<StateSummary[]> {
  const opps = await db.opportunity.findMany({ where: { isCancelled: false }, select: { state: true, revenue: true, marginPct: true } });
  return ORDER.map((state) => {
    const rows = opps.filter((o) => o.state === state);
    const revenue = rows.reduce((sum, o) => sum + Number(o.revenue), 0);
    const grossProfitTotal = rows.reduce((sum, o) => sum + grossProfit(Number(o.revenue), Number(o.marginPct)), 0);
    return { state, count: rows.length, revenue, grossProfit: grossProfitTotal };
  });
}

export async function opportunitiesForExport() {
  return db.opportunity.findMany({
    include: { account: true, accountable: true, status: true },
    orderBy: { createdAt: "desc" },
  });
}
