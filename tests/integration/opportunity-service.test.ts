import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { createOpportunity, setOpportunityStage, updateOpportunity, updateOpportunityField } from "@/services/opportunity-service";

let userId: string, accountId: string;

beforeAll(async () => {
  const u = await db.user.create({ data: { name: "T", email: `o${Date.now()}@x.com`, passwordHash: "x", role: "AGENT" } });
  userId = u.id;
  const a = await db.account.create({ data: { name: "Acme", createdById: userId } });
  accountId = a.id;
});
afterAll(async () => {
  await db.activityLog.deleteMany(); await db.notification.deleteMany(); await db.opportunity.deleteMany(); await db.status.deleteMany({ where: { label: { startsWith: "Demo " } } });
  await db.tag.deleteMany({ where: { label: { startsWith: "Demo " } } });
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

describe("opportunity-service: stage/status on create and inline edits", () => {
  it("creates in a chosen stage with a status of that stage", async () => {
    const status = await db.status.create({ data: { stage: "SALES", label: `Demo ${Date.now()}` } });
    const o = await createOpportunity({ accountId, title: "Staged", accountableId: userId, stage: "SALES", statusId: status.id, revenue: 1, marginPct: 1 }, userId);
    expect(o.stage).toBe("SALES");
    expect(o.statusId).toBe(status.id);
    await expect(
      createOpportunity({ accountId, title: "Bad", accountableId: userId, stage: "PROSPECT", statusId: status.id, revenue: 1, marginPct: 1 }, userId),
    ).rejects.toThrow(/does not belong/);
  });

  it("attaches tags of the chosen stage on create", async () => {
    const tag = await db.tag.create({ data: { stage: "SALES", label: `Demo tag ${Date.now()}` } });
    const o = await createOpportunity({ accountId, title: "Tagged", accountableId: userId, stage: "SALES", tagIds: [tag.id], revenue: 1, marginPct: 1 }, userId);
    expect(await db.opportunityTag.count({ where: { opportunityId: o.id, tagId: tag.id } })).toBe(1);
    expect(await db.activityLog.count({ where: { opportunityId: o.id, actionType: "tag-added" } })).toBe(1);
    await expect(
      createOpportunity({ accountId, title: "Bad tag", accountableId: userId, stage: "PROSPECT", tagIds: [tag.id], revenue: 1, marginPct: 1 }, userId),
    ).rejects.toThrow(/does not belong/);
  });

  it("updates a single field and logs only that change", async () => {
    const o = await createOpportunity({ accountId, title: "Inline", accountableId: userId, revenue: 10, marginPct: 5 }, userId);
    await updateOpportunityField(o.id, { field: "revenue", value: 250 }, userId);
    const row = await db.opportunity.findUniqueOrThrow({ where: { id: o.id } });
    expect(Number(row.revenue)).toBe(250);
    expect(row.title).toBe("Inline");
    const logs = await db.activityLog.findMany({ where: { opportunityId: o.id, actionType: "updated" } });
    expect(logs.map((l) => [l.fieldChanged, l.oldValue, l.newValue])).toEqual([["revenue", "10", "250"]]);
    // Clearing the status is allowed; no-op edits log nothing
    await updateOpportunityField(o.id, { field: "statusId", value: "" }, userId);
    expect(await db.activityLog.count({ where: { opportunityId: o.id, actionType: "updated" } })).toBe(1);
  });

  it("moves statusChangedAt only when the status itself changes", async () => {
    const status = await db.status.create({ data: { stage: "PROSPECT", label: `Demo st ${Date.now()}` } });
    const o = await createOpportunity({ accountId, title: "Stamped", accountableId: userId, revenue: 10, marginPct: 5 }, userId);
    const created = (await db.opportunity.findUniqueOrThrow({ where: { id: o.id } })).statusChangedAt;
    expect(created).toBeInstanceOf(Date);

    // An unrelated field must leave the stamp alone.
    await updateOpportunityField(o.id, { field: "title", value: "Stamped again" }, userId);
    expect((await db.opportunity.findUniqueOrThrow({ where: { id: o.id } })).statusChangedAt?.getTime()).toBe(created?.getTime());

    await updateOpportunityField(o.id, { field: "statusId", value: status.id }, userId);
    const afterStatus = (await db.opportunity.findUniqueOrThrow({ where: { id: o.id } })).statusChangedAt;
    expect(afterStatus!.getTime()).toBeGreaterThan(created!.getTime());

    // Advancing a stage clears the status, which counts as a change.
    await setOpportunityStage(o.id, "SALES", userId);
    const afterStage = (await db.opportunity.findUniqueOrThrow({ where: { id: o.id } })).statusChangedAt;
    expect(afterStage!.getTime()).toBeGreaterThanOrEqual(afterStatus!.getTime());
  });
});
