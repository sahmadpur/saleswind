import { describe, it, expect } from "vitest";
import { opportunityCreateSchema } from "@/schemas/opportunity";

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
});
