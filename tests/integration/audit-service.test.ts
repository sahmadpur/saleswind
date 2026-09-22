import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { createOpportunity, transitionOpportunity } from "@/services/opportunity-service";
import { listAudit } from "@/services/audit-service";

let userId: string, accountId: string;

beforeAll(async () => {
  userId = (await db.user.create({ data: { name: "Audit Tester", email: `audit${Date.now()}@x.com`, passwordHash: "x", role: "AGENT" } })).id;
  accountId = (await db.account.create({ data: { name: "Audit Acc", createdById: userId } })).id;
});
afterAll(async () => {
  await db.auditLog.deleteMany({ where: { userId } });
  await db.notification.deleteMany(); await db.activityLog.deleteMany();
  await db.opportunity.deleteMany(); await db.account.deleteMany(); await db.user.deleteMany(); await db.$disconnect();
});

describe("audit-service", () => {
  it("records opportunity create and transition, filterable by user and action", async () => {
    const o = await createOpportunity({ accountId, title: "Audited", accountableId: userId, revenue: 1, marginPct: 1 }, userId);
    await transitionOpportunity(o.id, "advance", userId);

    const all = await listAudit({ userId: [userId] }, 1);
    expect(all.rows.map((r) => r.action)).toEqual(["opportunity.advance", "opportunity.create"]);
    expect(all.rows[1].entityId).toBe(o.id);

    const onlyCreate = await listAudit({ userId: [userId], action: ["opportunity.create"] }, 1);
    expect(onlyCreate.total).toBe(1);
  });
});
