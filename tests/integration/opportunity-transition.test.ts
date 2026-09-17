import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { createOpportunity, transitionOpportunity } from "@/services/opportunity-service";

let userId: string, accountId: string;

beforeAll(async () => {
  const u = await db.user.create({ data: { name: "T", email: `tr${Date.now()}@x.com`, passwordHash: "x", role: "AGENT" } });
  userId = u.id;
  accountId = (await db.account.create({ data: { name: "A", createdById: userId } })).id;
});
afterAll(async () => {
  await db.notification.deleteMany(); await db.activityLog.deleteMany();
  await db.opportunity.deleteMany(); await db.account.deleteMany(); await db.user.deleteMany(); await db.$disconnect();
});

describe("transitionOpportunity", () => {
  it("advances one step and logs it", async () => {
    const o = await createOpportunity({ accountId, title: "T", accountableId: userId, revenue: 1, marginPct: 1 }, userId);
    const r = await transitionOpportunity(o.id, "advance", userId);
    expect(r.stage).toBe("SALES");
  });
  it("rejects advancing past PROJECT", async () => {
    const o = await createOpportunity({ accountId, title: "T", accountableId: userId, revenue: 1, marginPct: 1 }, userId);
    await transitionOpportunity(o.id, "advance", userId);
    await transitionOpportunity(o.id, "advance", userId);
    await transitionOpportunity(o.id, "advance", userId);
    await expect(transitionOpportunity(o.id, "advance", userId)).rejects.toThrow();
  });
  it("moves back without a reason", async () => {
    const o = await createOpportunity({ accountId, title: "T", accountableId: userId, revenue: 1, marginPct: 1 }, userId);
    await transitionOpportunity(o.id, "advance", userId);
    const r = await transitionOpportunity(o.id, "back", userId);
    expect(r.stage).toBe("PROSPECT");
  });
  it("cancels with a reason from any stage", async () => {
    const o = await createOpportunity({ accountId, title: "T", accountableId: userId, revenue: 1, marginPct: 1 }, userId);
    const r = await transitionOpportunity(o.id, "cancel", userId, "lost");
    expect(r.isCancelled).toBe(true);
  });
});
