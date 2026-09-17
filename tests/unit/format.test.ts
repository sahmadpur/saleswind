import { describe, it, expect, beforeAll } from "vitest";
import { dateOnly, dateTime, shortDate, shortName, todayIso } from "@/lib/format";

describe("shortName", () => {
  it("abbreviates the last name", () => {
    expect(shortName("Ruslan Sultanov")).toBe("Ruslan S.");
    expect(shortName("Anna Maria von berg")).toBe("Anna B.");
  });
  it("keeps single names and trims whitespace", () => {
    expect(shortName("Admin")).toBe("Admin");
    expect(shortName("  Jane   doe ")).toBe("Jane D.");
    expect(shortName("")).toBe("");
  });
});

describe("dates", () => {
  beforeAll(() => { process.env.APP_TIMEZONE = "UTC"; });
  it("formats exact date and time", () => {
    const d = new Date("2026-09-17T14:05:00Z");
    expect(dateTime(d)).toBe("17 Sep 2026, 14:05");
    expect(shortDate(d)).toBe("17 Sep 2026");
  });
});

describe("date-only helpers", () => {
  it("formats stored UTC dates without shifting and gives today in the app zone", () => {
    process.env.APP_TIMEZONE = "Asia/Baku";
    expect(dateOnly(new Date("2026-09-17T00:00:00Z"))).toBe("17 Sep 2026");
    expect(todayIso(new Date("2026-09-17T21:30:00Z"))).toBe("2026-09-18");
  });
});
