import { describe, it, expect, afterAll } from "vitest";
import { db } from "@/lib/db";
import { addStatus, toggleStatus, addTag, deleteStatus, deleteTag, deleteDefinition, upsertDefinition } from "@/services/dictionary-service";

const userId = "audit-test-user";
afterAll(async () => { await db.$disconnect(); });

describe("dictionary-service", () => {
  it("adds a status and toggles its active flag", async () => {
    const label = `S${Date.now()}`;
    const s = await addStatus("SALES", label, userId);
    expect(s.isActive).toBe(true);
    const t = await toggleStatus(s.id, userId);
    expect(t.isActive).toBe(false);
    await db.status.delete({ where: { id: s.id } });
  });
  it("adds a tag", async () => {
    const label = `T${Date.now()}`;
    const tag = await addTag("PROSPECT", label, userId);
    expect(tag.label).toBe(label);
    await db.tag.delete({ where: { id: tag.id } });
  });
  it("deletes unused statuses, refuses ones in use, and detaches deleted tags", async () => {
    const u = await db.user.create({ data: { name: "D", email: `dict${Date.now()}@x.com`, passwordHash: "x" } });
    const a = await db.account.create({ data: { name: "Dict", createdById: u.id } });
    const used = await addStatus("SALES", `Used ${Date.now()}`, userId);
    const unused = await addStatus("SALES", `Unused ${Date.now()}`, userId);
    const tag = await addTag("SALES", `Tag ${Date.now()}`, userId);
    const o = await db.opportunity.create({
      data: { accountId: a.id, title: "D", accountableId: u.id, stage: "SALES", statusId: used.id, createdById: u.id, lastModifiedById: u.id, tags: { create: { tagId: tag.id } } },
    });

    await deleteStatus(unused.id, userId);
    expect(await db.status.findUnique({ where: { id: unused.id } })).toBeNull();
    await expect(deleteStatus(used.id, userId)).rejects.toThrow(/used by 1 opportunity/);

    await deleteTag(tag.id, userId);
    expect(await db.opportunityTag.count({ where: { opportunityId: o.id } })).toBe(0);

    const d = await upsertDefinition(`Term ${Date.now()}`, "x", userId);
    await deleteDefinition(d.id, userId);
    expect(await db.definition.findUnique({ where: { id: d.id } })).toBeNull();

    await db.opportunity.delete({ where: { id: o.id } });
    await db.status.delete({ where: { id: used.id } });
    await db.account.delete({ where: { id: a.id } });
    await db.user.delete({ where: { id: u.id } });
  });
});
