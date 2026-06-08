import { describe, it, expect } from "vitest";
import { grossProfit } from "@/lib/domain/finance";

describe("grossProfit", () => {
  it("multiplies revenue by margin percent", () => {
    expect(grossProfit(100000, 30)).toBe(30000);
  });
  it("returns 0 when revenue is 0", () => {
    expect(grossProfit(0, 30)).toBe(0);
  });
  it("rounds to 2 decimals", () => {
    expect(grossProfit(99.99, 33.33)).toBe(33.33);
  });
});
