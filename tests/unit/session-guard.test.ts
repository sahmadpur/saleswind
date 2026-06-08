import { describe, it, expect } from "vitest";
import { assertRole } from "@/lib/session";
import type { Role } from "@prisma/client";

describe("assertRole", () => {
  const user = { id: "1", role: "AGENT" as Role };
  it("passes when the user has permission", () => {
    expect(() => assertRole(user, "opportunity:write")).not.toThrow();
  });
  it("throws when the user lacks permission", () => {
    expect(() => assertRole(user, "dictionary:manage")).toThrow("Forbidden");
  });
});
