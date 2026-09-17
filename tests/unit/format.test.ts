import { describe, it, expect, beforeAll } from "vitest";
import { dateTime, shortDate, shortName } from "@/lib/format";

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
