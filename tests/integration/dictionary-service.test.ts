import { describe, it, expect, afterAll } from "vitest";
import { db } from "@/lib/db";
import { addStatus, toggleStatus, addTag } from "@/services/dictionary-service";

afterAll(async () => { await db.$disconnect(); });

describe("dictionary-service", () => {
  it("adds a status and toggles its active flag", async () => {
    const label = `S${Date.now()}`;
    const s = await addStatus("SALES", label);
    expect(s.isActive).toBe(true);
    const t = await toggleStatus(s.id);
    expect(t.isActive).toBe(false);
    await db.status.delete({ where: { id: s.id } });
  });
  it("adds a tag", async () => {
    const label = `T${Date.now()}`;
    const tag = await addTag("PROSPECT", label);
    expect(tag.label).toBe(label);
    await db.tag.delete({ where: { id: tag.id } });
  });
});
