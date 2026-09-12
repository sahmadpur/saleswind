import { describe, it, expect } from "vitest";
import { filterOpportunities, parseFilters, parseSort, sortOpportunities } from "@/lib/opportunity-sort";

const row = (n: number, o: Partial<Parameters<typeof sortOpportunities>[0][number]> = {}) => ({
  number: n, title: `t${n}`, state: "PROSPECT", isCancelled: false, revenue: 100, marginPct: 10,
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
  it("sorts state by pipeline order with cancelled last", () => {
    const rows = [row(1, { state: "PROJECT" }), row(2, { state: "PROSPECT", isCancelled: true }), row(3, { state: "SALES" }), row(4, { state: "PROSPECT" })];
    expect(sortOpportunities(rows, "state", "asc").map((r) => r.number)).toEqual([4, 3, 1, 2]);
  });
  it("sorts status alphabetically, null first", () => {
    const rows = [row(1, { status: { label: "Won" } }), row(2, { status: null }), row(3, { status: { label: "demo" } })];
    expect(sortOpportunities(rows, "status", "asc").map((r) => r.number)).toEqual([2, 3, 1]);
  });
});

describe("filterOpportunities", () => {
  const rows = [
    row(1),
    row(2, { state: "SALES", status: { label: "Demo" }, accountable: { name: "Bob" }, account: { name: "Beta" } }),
    row(3, { state: "SALES", isCancelled: true }),
  ];
  it("parses only non-empty known keys", () => {
    expect(parseFilters({ state: "SALES", status: "", foo: "x", view: "table" })).toEqual({ state: "SALES" });
  });
  it("filters by display state, mapping cancelled", () => {
    expect(filterOpportunities(rows, { state: "SALES" }).map((r) => r.number)).toEqual([2]);
    expect(filterOpportunities(rows, { state: "CANCELLED" }).map((r) => r.number)).toEqual([3]);
  });
  it("filters by status, accountable, account and combines them", () => {
    expect(filterOpportunities(rows, { status: "Lead" }).map((r) => r.number)).toEqual([1, 3]);
    expect(filterOpportunities(rows, { accountable: "Bob" }).map((r) => r.number)).toEqual([2]);
    expect(filterOpportunities(rows, { account: "Acme", state: "PROSPECT" }).map((r) => r.number)).toEqual([1]);
    expect(filterOpportunities(rows, {})).toHaveLength(3);
  });
});
