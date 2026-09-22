import { describe, it, expect } from "vitest";
import { MAX_TAGS, opportunityCreateSchema } from "@/schemas/opportunity";

const full = {
  accountId: "a", title: "T", description: "D", accountableId: "u", stage: "PROSPECT",
  statusId: "s", tagIds: ["t"], revenue: "10", marginPct: "5",
};

describe("opportunityCreateSchema", () => {
  it("accepts a complete opportunity", () => {
    expect(opportunityCreateSchema.safeParse(full).success).toBe(true);
  });
  it("requires description, status, a tag, PR and MR", () => {
    const r = opportunityCreateSchema.safeParse({ ...full, description: " ", statusId: "", tagIds: [], revenue: "", marginPct: "" });
    expect(Object.keys(r.error!.flatten().fieldErrors).sort()).toEqual(["description", "marginPct", "revenue", "statusId", "tagIds"]);
  });
  it("takes up to MAX_TAGS tags and no more", () => {
    const tagIds = Array.from({ length: MAX_TAGS }, (_, i) => `t${i}`);
    expect(opportunityCreateSchema.safeParse({ ...full, tagIds }).success).toBe(true);
    const tooMany = opportunityCreateSchema.safeParse({ ...full, tagIds: [...tagIds, "extra"] });
    expect(tooMany.error!.flatten().fieldErrors.tagIds).toEqual([`Select at most ${MAX_TAGS} tags`]);
  });
});
