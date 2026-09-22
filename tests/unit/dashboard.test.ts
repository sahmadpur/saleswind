import { describe, it, expect } from "vitest";
import {
  byAccountable, byStage, currentMonth, inMonth, isOpen, monthlyByStatus, toMonth, totals,
  type DashboardRow,
} from "@/lib/domain/dashboard";

const row = (o: Partial<DashboardRow> = {}): DashboardRow => ({
  stage: "PROSPECT",
  revenue: 1000,
  marginPct: 20,
  statusLabel: "In Progress",
  accountable: "Ann",
  lastModifiedAt: new Date("2026-09-10T00:00:00Z"),
  statusChangedAt: new Date("2026-09-10T00:00:00Z"),
  ...o,
});

describe("isOpen", () => {
  it("counts only in-progress, pending and not started", () => {
    expect(isOpen(row({ statusLabel: "In Progress" }))).toBe(true);
    expect(isOpen(row({ statusLabel: "Pending" }))).toBe(true);
    expect(isOpen(row({ statusLabel: "Not Started" }))).toBe(true);
    expect(isOpen(row({ statusLabel: "Cancelled" }))).toBe(false);
    expect(isOpen(row({ statusLabel: null }))).toBe(false);
  });
});

describe("inMonth", () => {
  it("keeps rows last changed in that month", () => {
    const rows = [row(), row({ lastModifiedAt: new Date("2026-08-31T23:00:00Z") })];
    expect(inMonth(rows, "2026-09")).toHaveLength(1);
    expect(inMonth(rows, "2026-08")).toHaveLength(1);
    expect(inMonth(rows, "2026-07")).toHaveLength(0);
  });
  it("formats the current month as YYYY-MM", () => {
    expect(currentMonth(new Date("2026-01-05T00:00:00Z"))).toBe("2026-01");
    expect(toMonth(new Date("2026-12-31T00:00:00Z"))).toBe("2026-12");
  });
});

describe("byStage", () => {
  it("always returns all four stages in pipeline order", () => {
    expect(byStage([]).map((s) => s.stage)).toEqual(["PROSPECT", "SALES", "CONTRACT", "PROJECT"]);
    expect(byStage([]).every((s) => s.count === 0 && s.gp === 0)).toBe(true);
  });
  it("sums count, revenue and gross profit per stage", () => {
    const rows = [row(), row({ revenue: 500, marginPct: 10 }), row({ stage: "SALES", revenue: 2000, marginPct: 50 })];
    const [prospect, sales] = byStage(rows);
    expect(prospect).toMatchObject({ count: 2, revenue: 1500, gp: 250 });
    expect(sales).toMatchObject({ count: 1, revenue: 2000, gp: 1000 });
  });
});

describe("byAccountable", () => {
  it("groups by name, sorted, skipping anyone with no rows", () => {
    const rows = [row({ accountable: "Bob" }), row({ accountable: "Ann" }), row({ accountable: "Ann" })];
    const out = byAccountable(rows);
    expect(out.map((a) => a.name)).toEqual(["Ann", "Bob"]);
    expect(out[0].count).toBe(2);
    expect(out[0].stages).toHaveLength(4);
  });
});

describe("monthlyByStatus", () => {
  const now = new Date("2026-09-15T00:00:00Z");
  it("returns one bucket per month, oldest first, zeros included", () => {
    const out = monthlyByStatus([], "Cancelled", 3, now);
    expect(out.map((m) => m.month)).toEqual(["2026-07", "2026-08", "2026-09"]);
    expect(out.every((m) => m.count === 0)).toBe(true);
  });
  it("buckets on statusChangedAt, not lastModifiedAt", () => {
    const rows = [
      row({ statusLabel: "Cancelled", statusChangedAt: new Date("2026-08-02T00:00:00Z"), lastModifiedAt: now }),
      row({ statusLabel: "Cancelled", statusChangedAt: new Date("2026-09-01T00:00:00Z") }),
    ];
    expect(monthlyByStatus(rows, "Cancelled", 3, now)).toEqual([
      { month: "2026-07", count: 0 },
      { month: "2026-08", count: 1 },
      { month: "2026-09", count: 1 },
    ]);
  });
  it("ignores other statuses, rows with no recorded change, and months outside the window", () => {
    const rows = [
      row({ statusLabel: "Pending", statusChangedAt: new Date("2026-09-01T00:00:00Z") }),
      row({ statusLabel: "Cancelled", statusChangedAt: null }),
      row({ statusLabel: "Cancelled", statusChangedAt: new Date("2025-01-01T00:00:00Z") }),
    ];
    expect(monthlyByStatus(rows, "Cancelled", 3, now).every((m) => m.count === 0)).toBe(true);
  });
});

describe("totals", () => {
  it("sums count, revenue and gross profit", () => {
    expect(totals([row(), row({ revenue: 2000, marginPct: 50 })])).toEqual({ count: 2, revenue: 3000, gp: 1200 });
  });
});
