import { describe, it, expect } from "vitest";
import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("renders headers and rows and escapes commas/quotes", () => {
    const csv = toCsv(["name", "note"], [["Acme, Inc", 'He said "hi"']]);
    expect(csv).toBe('name,note\n"Acme, Inc","He said ""hi"""');
  });
});
