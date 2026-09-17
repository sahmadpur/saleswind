import { describe, it, expect } from "vitest";
import { pageWindow, paginate, parsePage } from "@/lib/pagination";

describe("pagination", () => {
  it("parses page and size with defaults and clamping", () => {
    expect(parsePage({})).toEqual({ page: 1, size: 25 });
    expect(parsePage({ page: "3", size: "50" })).toEqual({ page: 3, size: 50 });
    expect(parsePage({ page: "-2", size: "7" })).toEqual({ page: 1, size: 25 });
    expect(parsePage({ page: "abc" })).toEqual({ page: 1, size: 25 });
  });
  it("slices a page and clamps past the end", () => {
    const rows = Array.from({ length: 60 }, (_, i) => i);
    expect(paginate(rows, 2, 25)).toEqual({ rows: rows.slice(25, 50), page: 2, pageCount: 3 });
    expect(paginate(rows, 9, 25).page).toBe(3);
    expect(paginate([], 1, 25)).toEqual({ rows: [], page: 1, pageCount: 1 });
  });
  it("builds a compact page window", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(5, 12)).toEqual([1, null, 4, 5, 6, null, 12]);
    expect(pageWindow(3, 12)).toEqual([1, 2, 3, 4, null, 12]);
    expect(pageWindow(1, 4)).toEqual([1, 2, 3, 4]);
  });
});
