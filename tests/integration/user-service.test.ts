import { describe, it, expect, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createUser, listUsers } from "@/services/user-service";

afterAll(async () => { await db.$disconnect(); });

describe("user-service", () => {
  it("creates a user with a hashed password", async () => {
    const email = `u${Date.now()}@x.com`;
    const u = await createUser({ name: "New", email, password: "password1", role: "MANAGER" });
    expect(u.role).toBe("MANAGER");
    const row = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(row.passwordHash).not.toBe("password1");
    expect(await bcrypt.compare("password1", row.passwordHash)).toBe(true);
    expect((await listUsers()).some((x) => x.id === u.id)).toBe(true);
    await db.user.delete({ where: { id: u.id } });
  });
});
