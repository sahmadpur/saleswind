import { describe, it, expect, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createUser, deleteUser, listUsers, setUserBlocked, updateUser } from "@/services/user-service";

afterAll(async () => { await db.$disconnect(); });

describe("user-service", () => {
  it("creates a user with a hashed password", async () => {
    const email = `u${Date.now()}@x.com`;
    const u = await createUser({ name: "New", email, password: "password1", role: "MANAGER" }, null);
    expect(u.role).toBe("MANAGER");
    const row = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(row.passwordHash).not.toBe("password1");
    expect(await bcrypt.compare("password1", row.passwordHash)).toBe(true);
    expect((await listUsers()).some((x) => x.id === u.id)).toBe(true);
    await db.user.delete({ where: { id: u.id } });
  });

  it("deletes a user without opportunities or comments", async () => {
    const u = await createUser({ name: "Gone", email: `d${Date.now()}@x.com`, password: "password1", role: "AGENT" }, null);
    await db.notification.create({ data: { userId: u.id, type: "TEST", message: "hi" } });
    await deleteUser(u.id, null);
    expect(await db.user.findUnique({ where: { id: u.id } })).toBeNull();
  });

  it("refuses to delete a user who is accountable for an opportunity", async () => {
    const u = await createUser({ name: "Busy", email: `b${Date.now()}@x.com`, password: "password1", role: "AGENT" }, null);
    const account = await db.account.create({ data: { name: `Acc ${Date.now()}`, createdById: u.id } });
    const opp = await db.opportunity.create({
      data: { title: "Deal", accountId: account.id, accountableId: u.id, createdById: u.id, lastModifiedById: u.id },
    });
    await expect(deleteUser(u.id, null)).rejects.toThrow(/Cannot delete/);
    await db.opportunity.delete({ where: { id: opp.id } });
    await db.account.delete({ where: { id: account.id } });
    await db.user.delete({ where: { id: u.id } });
  });

  it("force-deletes a busy user, moving their opportunities and tasks to the actor and dropping their comments", async () => {
    const admin = await createUser({ name: "Admin", email: `fa${Date.now()}@x.com`, password: "password1", role: "ADMIN" }, null);
    const u = await createUser({ name: "Leaver", email: `fl${Date.now()}@x.com`, password: "password1", role: "AGENT" }, null);
    const account = await db.account.create({ data: { name: `Acc ${Date.now()}`, createdById: u.id } });
    const opp = await db.opportunity.create({
      data: { title: "Deal", accountId: account.id, accountableId: u.id, createdById: u.id, lastModifiedById: u.id },
    });
    const task = await db.task.create({ data: { title: "Todo", assigneeId: u.id, createdById: u.id } });
    const comment = await db.comment.create({ data: { opportunityId: opp.id, authorId: u.id, body: "hi" } });

    await expect(deleteUser(u.id, null, { force: true })).rejects.toThrow(/reassign/);
    const counts = await deleteUser(u.id, admin.id, { force: true });
    expect(counts).toEqual({ opportunities: 1, comments: 1, tasks: 1 });

    expect(await db.user.findUnique({ where: { id: u.id } })).toBeNull();
    expect((await db.opportunity.findUniqueOrThrow({ where: { id: opp.id } })).accountableId).toBe(admin.id);
    const t = await db.task.findUniqueOrThrow({ where: { id: task.id } });
    expect([t.assigneeId, t.createdById]).toEqual([admin.id, admin.id]);
    expect(await db.comment.findUnique({ where: { id: comment.id } })).toBeNull();
    const log = await db.auditLog.findFirstOrThrow({ where: { action: "user.delete", entityId: u.id } });
    expect(log.userId).toBe(admin.id);
    expect(log.details).toMatchObject({ reassignedTo: admin.id, opportunities: 1, tasks: 1, comments: 1 });

    await db.task.delete({ where: { id: task.id } });
    await db.opportunity.delete({ where: { id: opp.id } });
    await db.account.delete({ where: { id: account.id } });
    await db.auditLog.deleteMany({ where: { entityId: u.id } });
    await db.user.delete({ where: { id: admin.id } });
  });
});

describe("user-service: updateUser", () => {
  it("updates name, email, role and optionally password", async () => {
    const actor = await createUser({ name: "Boss", email: `boss${Date.now()}@x.com`, password: "password1", role: "ADMIN" }, null);
    const u = await createUser({ name: "Ed", email: `ed${Date.now()}@x.com`, password: "password1", role: "AGENT" }, null);
    const email = `ed2${Date.now()}@x.com`;
    await updateUser(u.id, { name: "Edward", email, role: "MANAGER", password: "" }, actor.id);
    let row = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    expect([row.name, row.email, row.role]).toEqual(["Edward", email, "MANAGER"]);
    expect(await bcrypt.compare("password1", row.passwordHash)).toBe(true);
    await updateUser(u.id, { name: "Edward", email, role: "MANAGER", password: "newpass99" }, actor.id);
    row = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(await bcrypt.compare("newpass99", row.passwordHash)).toBe(true);
    await db.user.deleteMany({ where: { id: { in: [u.id, actor.id] } } });
  });

  it("rejects duplicate emails, self role changes and removing the last admin", async () => {
    await db.user.updateMany({ where: { role: "ADMIN" }, data: { role: "MANAGER" } });
    const admin = await createUser({ name: "Only", email: `only${Date.now()}@x.com`, password: "password1", role: "ADMIN" }, null);
    const other = await createUser({ name: "Other", email: `other${Date.now()}@x.com`, password: "password1", role: "AGENT" }, null);
    await expect(updateUser(other.id, { name: "Other", email: admin.email, role: "AGENT" }, admin.id)).rejects.toThrow("Email is already in use");
    await expect(updateUser(admin.id, { name: "Only", email: admin.email, role: "AGENT" }, admin.id)).rejects.toThrow("You cannot change your own role");
    await expect(updateUser(admin.id, { name: "Only", email: admin.email, role: "AGENT" }, other.id)).rejects.toThrow("At least one admin is required");
    await db.user.deleteMany({ where: { id: { in: [admin.id, other.id] } } });
  });
});

describe("user-service: setUserBlocked", () => {
  it("blocks and unblocks, refusing self and the last active admin", async () => {
    await db.user.updateMany({ where: { role: "ADMIN" }, data: { role: "MANAGER" } });
    const admin = await createUser({ name: "Admin", email: `ba${Date.now()}@x.com`, password: "password1", role: "ADMIN" }, null);
    const agent = await createUser({ name: "Agent", email: `bb${Date.now()}@x.com`, password: "password1", role: "AGENT" }, null);

    expect((await setUserBlocked(agent.id, true, admin.id)).blockedAt).toBeInstanceOf(Date);
    expect((await listUsers()).find((u) => u.id === agent.id)?.blockedAt).not.toBeNull();
    expect((await setUserBlocked(agent.id, false, admin.id)).blockedAt).toBeNull();

    await expect(setUserBlocked(admin.id, true, admin.id)).rejects.toThrow("You cannot block yourself");
    await expect(setUserBlocked(admin.id, true, agent.id)).rejects.toThrow("At least one active admin is required");

    const audits = await db.auditLog.findMany({ where: { entityId: agent.id, action: { in: ["user.block", "user.unblock"] } } });
    expect(audits).toHaveLength(2);
    await db.auditLog.deleteMany({ where: { entityId: { in: [admin.id, agent.id] } } });
    await db.user.deleteMany({ where: { id: { in: [admin.id, agent.id] } } });
  });
});
