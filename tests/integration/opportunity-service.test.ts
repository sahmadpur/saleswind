import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { createOpportunity, updateOpportunity } from "@/services/opportunity-service";

let userId: string, accountId: string;

beforeAll(async () => {
  const u = await db.user.create({ data: { name: "T", email: `o${Date.now()}@x.com`, passwordHash: "x", role: "AGENT" } });
  userId = u.id;
  const a = await db.account.create({ data: { name: "Acme", createdById: userId } });
  accountId = a.id;
});
afterAll(async () => {
  await db.activityLog.deleteMany(); await db.opportunity.deleteMany();
  await db.account.deleteMany(); await db.user.deleteMany(); await db.$disconnect();
});

describe("opportunity-service", () => {
  it("creates an opportunity and logs creation", async () => {
    const o = await createOpportunity({ accountId, title: "5 Printers", accountableId: userId, revenue: 100000, marginPct: 30 }, userId);
    expect(o.title).toBe("5 Printers");
    const logs = await db.activityLog.findMany({ where: { opportunityId: o.id } });
    expect(logs.some((l) => l.actionType === "created")).toBe(true);
  });

  it("logs a field change on update and stamps lastModified", async () => {
    const o = await createOpportunity({ accountId, title: "Old", accountableId: userId, revenue: 1, marginPct: 1 }, userId);
    await updateOpportunity(o.id, { title: "New", accountableId: userId, revenue: 1, marginPct: 1 }, userId);
    const logs = await db.activityLog.findMany({ where: { opportunityId: o.id, fieldChanged: "title" } });
    expect(logs[0].oldValue).toBe("Old");
    expect(logs[0].newValue).toBe("New");
    const updated = await db.opportunity.findUnique({ where: { id: o.id } });
    expect(updated?.lastModifiedById).toBe(userId);
  });
});
