import { describe, it, expect } from "vitest";
import {
  applyFilters, distinct, haystack, matchesSearch, param, paramList, parseMultiFilters,
  parseSort, queryParams, sortRows, type SortDir,
} from "@/lib/table";

describe("query params", () => {
  it("keeps every value of a repeated key", () => {
    expect(paramList({ stage: ["SALES", "CONTRACT"] }, "stage")).toEqual(["SALES", "CONTRACT"]);
    expect(paramList({ stage: "SALES" }, "stage")).toEqual(["SALES"]);
    expect(paramList({}, "stage")).toEqual([]);
    expect(paramList({ stage: ["", "SALES"] }, "stage")).toEqual(["SALES"]);
  });
  it("takes the first value for single-valued params", () => {
    expect(param({ sort: ["name", "email"] }, "sort")).toBe("name");
    expect(param({}, "sort")).toBeUndefined();
  });
  it("round-trips a URLSearchParams with repeated keys", () => {
    const qs = new URLSearchParams("stage=SALES&stage=CONTRACT&q=acme");
    expect(queryParams(qs)).toEqual({ stage: ["SALES", "CONTRACT"], q: "acme" });
  });
  it("collects only the keys it is given", () => {
    expect(parseMultiFilters({ a: "1", b: ["2", "3"], c: "4" }, ["a", "b"] as const))
      .toEqual({ a: ["1"], b: ["2", "3"] });
  });
});

describe("parseSort", () => {
  const dir: Record<"name" | "age", SortDir> = { name: "asc", age: "desc" };
  it("falls back for unknown keys and takes each column's natural direction", () => {
    expect(parseSort(["name", "age"], dir, "name", "nope")).toEqual({ sort: "name", dir: "asc" });
    expect(parseSort(["name", "age"], dir, "name", "age")).toEqual({ sort: "age", dir: "desc" });
    expect(parseSort(["name", "age"], dir, "name", "age", "asc")).toEqual({ sort: "age", dir: "asc" });
    expect(parseSort(["name", "age"], dir, "name", "age", "sideways")).toEqual({ sort: "age", dir: "desc" });
  });
});

describe("sortRows", () => {
  const rows = [{ n: 2 }, { n: 1 }, { n: 3 }];
  it("sorts both ways without mutating the input", () => {
    expect(sortRows(rows, "n", "asc", (r) => r.n).map((r) => r.n)).toEqual([1, 2, 3]);
    expect(sortRows(rows, "n", "desc", (r) => r.n).map((r) => r.n)).toEqual([3, 2, 1]);
    expect(rows.map((r) => r.n)).toEqual([2, 1, 3]);
  });
});

describe("applyFilters", () => {
  type Row = { kind: string; owner: string | null };
  const rows: Row[] = [
    { kind: "a", owner: "Ann" },
    { kind: "b", owner: "Bob" },
    { kind: "a", owner: null },
  ];
  const accessors = { kind: (r: Row) => r.kind, owner: (r: Row) => r.owner };

  it("treats an empty filter as 'all'", () => {
    expect(applyFilters(rows, { kind: [], owner: [] }, accessors)).toHaveLength(3);
  });
  it("ORs within a key and ANDs across keys", () => {
    expect(applyFilters(rows, { kind: ["a", "b"], owner: [] }, accessors)).toHaveLength(3);
    expect(applyFilters(rows, { kind: ["a"], owner: ["Ann"] }, accessors)).toEqual([rows[0]]);
  });
  it("matches a missing value as the empty string", () => {
    expect(applyFilters(rows, { kind: [], owner: [""] }, accessors)).toEqual([rows[2]]);
  });
});

describe("search", () => {
  it("needs every term, ignoring case and accents", () => {
    const hay = haystack(["ACC-0007", "Café Beta", null, 7]);
    expect(matchesSearch(hay, "cafe")).toBe(true);
    expect(matchesSearch(hay, "  CAFE   beta ")).toBe(true);
    expect(matchesSearch(hay, "acc-0007")).toBe(true);
    expect(matchesSearch(hay, "cafe zzz")).toBe(false);
    expect(matchesSearch(hay, "")).toBe(true);
  });
  it("does not let a term span two fields", () => {
    expect(matchesSearch(haystack(["ab", "cd"]), "abcd")).toBe(false);
  });
});

describe("distinct", () => {
  it("drops blanks and sorts", () => {
    expect(distinct(["Beta", null, "Acme", undefined, "Beta", ""])).toEqual(["Acme", "Beta"]);
  });
});
