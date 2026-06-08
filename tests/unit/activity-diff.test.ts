import { describe, it, expect } from "vitest";
import { diffFields } from "@/lib/domain/activity-diff";

describe("diffFields", () => {
  it("returns one entry per changed field", () => {
    const entries = diffFields(
      { title: "A", revenue: 100 },
      { title: "B", revenue: 100 }
    );
    expect(entries).toEqual([{ fieldChanged: "title", oldValue: "A", newValue: "B" }]);
  });
  it("returns empty array when nothing changed", () => {
    expect(diffFields({ title: "A" }, { title: "A" })).toEqual([]);
  });
  it("stringifies non-string values", () => {
    const entries = diffFields({ revenue: 100 }, { revenue: 200 });
    expect(entries).toEqual([{ fieldChanged: "revenue", oldValue: "100", newValue: "200" }]);
  });
  it("captures a field removed in after", () => {
    expect(diffFields({ title: "A", note: "x" }, { title: "A" })).toEqual([
      { fieldChanged: "note", oldValue: "x", newValue: null },
    ]);
  });
});
