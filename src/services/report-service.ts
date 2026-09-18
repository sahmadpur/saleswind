import "server-only";
import { db } from "@/lib/db";
import { ORDER } from "@/lib/domain/lifecycle";
import { grossProfit } from "@/lib/domain/finance";
import type { Stage } from "@prisma/client";

export interface StageSummary { stage: Stage; count: number; revenue: number; grossProfit: number; }

export async function pipelineSummary(): Promise<StageSummary[]> {
  const opps = await db.opportunity.findMany({ where: { NOT: { status: { is: { label: "Cancelled" } } } }, select: { stage: true, revenue: true, marginPct: true } });
  return ORDER.map((stage) => {
    const rows = opps.filter((o) => o.stage === stage);
    const revenue = rows.reduce((sum, o) => sum + Number(o.revenue), 0);
    const grossProfitTotal = rows.reduce((sum, o) => sum + grossProfit(Number(o.revenue), Number(o.marginPct)), 0);
    return { stage, count: rows.length, revenue, grossProfit: grossProfitTotal };
  });
}

export async function opportunitiesForExport() {
  return db.opportunity.findMany({
    include: { account: true, accountable: true, status: true, tags: { include: { tag: true } } },
    orderBy: { createdAt: "desc" },
  });
}
