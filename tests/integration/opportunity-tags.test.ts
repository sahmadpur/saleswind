import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { createOpportunity } from "@/services/opportunity-service";
import { attachTag, detachTag } from "@/services/opportunity-service";
import { MAX_TAGS } from "@/schemas/opportunity";

let userId: string, accountId: string, tagId: string;
/** MAX_TAGS + 1 spare tags, so the cap can be reached and then exceeded. */
let spareTagIds: string[];

beforeAll(async () => {
  const u = await db.user.create({ data: { name: "T", email: `tag${Date.now()}@x.com`, passwordHash: "x", role: "AGENT" } });
  userId = u.id;
  accountId = (await db.account.create({ data: { name: "A", createdById: userId } })).id;
  tagId = (await db.tag.create({ data: { stage: "PROSPECT", label: `Tag${Date.now()}` } })).id;
  spareTagIds = [];
  for (let i = 0; i <= MAX_TAGS; i++) {
    const t = await db.tag.create({ data: { stage: "PROSPECT", label: `Spare${Date.now()}-${i}` } });
    spareTagIds.push(t.id);
  }
});
afterAll(async () => {
  await db.activityLog.deleteMany(); await db.opportunityTag.deleteMany(); await db.opportunity.deleteMany();
  await db.tag.deleteMany({ where: { id: { in: [tagId, ...spareTagIds] } } });
  await db.account.deleteMany(); await db.user.deleteMany(); await db.$disconnect();
});

describe("tags", () => {
  it("attaches and detaches a tag", async () => {
    const o = await createOpportunity({ accountId, title: "T", accountableId: userId, revenue: 1, marginPct: 1 }, userId);
    await attachTag(o.id, tagId, userId);
    expect(await db.opportunityTag.count({ where: { opportunityId: o.id } })).toBe(1);
    // A second tag first, so detaching the original isn't blocked by the min-1 rule.
    await attachTag(o.id, spareTagIds[0], userId);
    await detachTag(o.id, tagId, userId);
    expect(await db.opportunityTag.count({ where: { opportunityId: o.id } })).toBe(1);
  });

  it("refuses to create an opportunity with more than MAX_TAGS tags", async () => {
    await expect(
      createOpportunity({ accountId, title: "Too many", accountableId: userId, revenue: 1, marginPct: 1, tagIds: spareTagIds }, userId),
    ).rejects.toThrow(`at most ${MAX_TAGS} tags`);
  });

  it("refuses to attach past MAX_TAGS", async () => {
    const tagIds = spareTagIds.slice(0, MAX_TAGS);
    const o = await createOpportunity({ accountId, title: "Full", accountableId: userId, revenue: 1, marginPct: 1, tagIds }, userId);
    expect(await db.opportunityTag.count({ where: { opportunityId: o.id } })).toBe(MAX_TAGS);
    await expect(attachTag(o.id, spareTagIds[MAX_TAGS], userId)).rejects.toThrow(`at most ${MAX_TAGS} tags`);
    expect(await db.opportunityTag.count({ where: { opportunityId: o.id } })).toBe(MAX_TAGS);
  });

  it("refuses to detach the last tag", async () => {
    const o = await createOpportunity({ accountId, title: "One tag", accountableId: userId, revenue: 1, marginPct: 1, tagIds: [tagId] }, userId);
    await expect(detachTag(o.id, tagId, userId)).rejects.toThrow("at least 1 tag");
    expect(await db.opportunityTag.count({ where: { opportunityId: o.id } })).toBe(1);
  });
});
