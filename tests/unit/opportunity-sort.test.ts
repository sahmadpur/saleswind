import { describe, it, expect } from "vitest";
import { filterOpportunities, parseFilters, parseSort, sortOpportunities } from "@/lib/opportunity-sort";

const row = (n: number, o: Partial<Parameters<typeof sortOpportunities>[0][number]> = {}) => ({
  number: n, title: `t${n}`, stage: "PROSPECT", isCancelled: false, revenue: 100, marginPct: 10,
  account: { name: "Acme" }, accountable: { name: "Ann" }, status: { label: "Lead" } as { label: string } | null,
  lastModifiedAt: new Date(n * 1000), ...o,
});

describe("parseSort", () => {
  it("defaults to modified desc", () => {
    expect(parseSort(undefined, undefined)).toEqual({ sort: "modified", dir: "desc" });
    expect(parseSort("created", undefined)).toEqual({ sort: "modified", dir: "desc" });
  });
});

describe("sortOpportunities", () => {
  it("sorts stage by pipeline order with cancelled last", () => {
    const rows = [row(1, { stage: "PROJECT" }), row(2, { stage: "PROSPECT", isCancelled: true }), row(3, { stage: "SALES" }), row(4, { stage: "PROSPECT" })];
    expect(sortOpportunities(rows, "stage", "asc").map((r) => r.number)).toEqual([4, 3, 1, 2]);
  });
  it("sorts status alphabetically, null first", () => {
    const rows = [row(1, { status: { label: "Won" } }), row(2, { status: null }), row(3, { status: { label: "demo" } })];
    expect(sortOpportunities(rows, "status", "asc").map((r) => r.number)).toEqual([2, 3, 1]);
  });
});

describe("filterOpportunities", () => {
  const rows = [
    row(1),
    row(2, { stage: "SALES", status: { label: "Demo" }, accountable: { name: "Bob" }, account: { name: "Beta" } }),
    row(3, { stage: "SALES", isCancelled: true }),
  ];
  it("parses only non-empty known keys", () => {
    expect(parseFilters({ stage: "SALES", status: "", foo: "x", view: "table" })).toEqual({ stage: "SALES" });
  });
  it("filters by display stage, mapping cancelled", () => {
    expect(filterOpportunities(rows, { stage: "SALES" }).map((r) => r.number)).toEqual([2]);
    expect(filterOpportunities(rows, { stage: "CANCELLED" }).map((r) => r.number)).toEqual([3]);
  });
  it("filters by status, accountable, account and combines them", () => {
    expect(filterOpportunities(rows, { status: "Lead" }).map((r) => r.number)).toEqual([1, 3]);
    expect(filterOpportunities(rows, { accountable: "Bob" }).map((r) => r.number)).toEqual([2]);
    expect(filterOpportunities(rows, { account: "Acme", stage: "PROSPECT" }).map((r) => r.number)).toEqual([1]);
    expect(filterOpportunities(rows, {})).toHaveLength(3);
  });
});
