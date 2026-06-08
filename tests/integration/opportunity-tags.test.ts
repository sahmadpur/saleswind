import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { createOpportunity } from "@/services/opportunity-service";
import { attachTag, detachTag } from "@/services/opportunity-service";

let userId: string, accountId: string, tagId: string;

beforeAll(async () => {
  const u = await db.user.create({ data: { name: "T", email: `tag${Date.now()}@x.com`, passwordHash: "x", role: "AGENT" } });
  userId = u.id;
  accountId = (await db.account.create({ data: { name: "A", createdById: userId } })).id;
  tagId = (await db.tag.create({ data: { state: "PROSPECT", label: `Tag${Date.now()}` } })).id;
});
afterAll(async () => {
  await db.activityLog.deleteMany(); await db.opportunityTag.deleteMany(); await db.opportunity.deleteMany();
  await db.tag.deleteMany({ where: { id: tagId } }); await db.account.deleteMany(); await db.user.deleteMany(); await db.$disconnect();
});

describe("tags", () => {
  it("attaches and detaches a tag", async () => {
    const o = await createOpportunity({ accountId, title: "T", ownerId: userId, revenue: 1, marginPct: 1 }, userId);
    await attachTag(o.id, tagId, userId);
    expect(await db.opportunityTag.count({ where: { opportunityId: o.id } })).toBe(1);
    await detachTag(o.id, tagId, userId);
    expect(await db.opportunityTag.count({ where: { opportunityId: o.id } })).toBe(0);
  });
});
