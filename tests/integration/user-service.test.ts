import { describe, it, expect, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createUser, deleteUser, listUsers } from "@/services/user-service";

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

  it("deletes a user without opportunities or comments", async () => {
    const u = await createUser({ name: "Gone", email: `d${Date.now()}@x.com`, password: "password1", role: "AGENT" });
    await db.notification.create({ data: { userId: u.id, type: "TEST", message: "hi" } });
    await deleteUser(u.id);
    expect(await db.user.findUnique({ where: { id: u.id } })).toBeNull();
  });

  it("refuses to delete a user who is accountable for an opportunity", async () => {
    const u = await createUser({ name: "Busy", email: `b${Date.now()}@x.com`, password: "password1", role: "AGENT" });
    const account = await db.account.create({ data: { name: `Acc ${Date.now()}`, createdById: u.id } });
    const opp = await db.opportunity.create({
      data: { title: "Deal", accountId: account.id, accountableId: u.id, createdById: u.id, lastModifiedById: u.id },
    });
    await expect(deleteUser(u.id)).rejects.toThrow(/Cannot delete/);
    await db.opportunity.delete({ where: { id: opp.id } });
    await db.account.delete({ where: { id: account.id } });
    await db.user.delete({ where: { id: u.id } });
  });
});
