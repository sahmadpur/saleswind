import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { createOpportunity } from "@/services/opportunity-service";
import { pipelineSummary } from "@/services/report-service";

let userId: string, accountId: string;

beforeAll(async () => {
  const u = await db.user.create({ data: { name: "T", email: `r${Date.now()}@x.com`, passwordHash: "x", role: "MANAGER" } });
  userId = u.id;
  accountId = (await db.account.create({ data: { name: "A", createdById: userId } })).id;
  await createOpportunity({ accountId, title: "X", ownerId: userId, revenue: 100000, marginPct: 30 }, userId);
});
afterAll(async () => {
  await db.activityLog.deleteMany(); await db.opportunity.deleteMany(); await db.account.deleteMany(); await db.user.deleteMany(); await db.$disconnect();
});

describe("report-service", () => {
  it("summarizes pipeline by state with revenue and gross profit", async () => {
    const summary = await pipelineSummary();
    const prospect = summary.find((s) => s.state === "PROSPECT");
    expect(prospect?.count).toBeGreaterThanOrEqual(1);
    expect(prospect?.revenue).toBeGreaterThanOrEqual(100000);
    expect(prospect?.grossProfit).toBeGreaterThanOrEqual(30000);
  });
});
