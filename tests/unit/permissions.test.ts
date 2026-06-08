import { describe, it, expect } from "vitest";
import { can } from "@/lib/domain/permissions";

describe("permissions", () => {
  it("agents can manage opportunities but not the dictionary", () => {
    expect(can("AGENT", "opportunity:write")).toBe(true);
    expect(can("AGENT", "dictionary:manage")).toBe(false);
    expect(can("AGENT", "reports:view")).toBe(false);
  });
  it("managers can view reports", () => {
    expect(can("MANAGER", "reports:view")).toBe(true);
    expect(can("MANAGER", "dictionary:manage")).toBe(false);
  });
  it("admins can do everything", () => {
    expect(can("ADMIN", "dictionary:manage")).toBe(true);
    expect(can("ADMIN", "users:manage")).toBe(true);
    expect(can("ADMIN", "reports:view")).toBe(true);
  });
});
