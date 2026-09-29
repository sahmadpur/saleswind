import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { createAccount, deleteAccount, listAccounts } from "@/services/account-service";

let userId: string;

beforeAll(async () => {
  const u = await db.user.create({ data: { name: "T", email: `t${Date.now()}@x.com`, passwordHash: "x", role: "AGENT" } });
  userId = u.id;
});
afterAll(async () => { await db.account.deleteMany(); await db.user.deleteMany(); await db.$disconnect(); });

describe("account-service", () => {
  it("creates an account with an auto number and lists it", async () => {
    const acc = await createAccount({ name: "Acme" }, userId);
    expect(acc.name).toBe("Acme");
    expect(acc.number).toBeGreaterThan(0);
    const list = await listAccounts();
    expect(list.some((a) => a.id === acc.id)).toBe(true);
  });

  it("deletes an account together with its opportunities", async () => {
    const busy = await createAccount({ name: "Busy" }, userId);
    const opp = await db.opportunity.create({ data: { title: "Deal", accountId: busy.id, accountableId: userId, createdById: userId, lastModifiedById: userId } });
    await db.comment.create({ data: { opportunityId: opp.id, authorId: userId, body: "x" } });
    await deleteAccount(busy.id, userId);
    expect(await db.account.findUnique({ where: { id: busy.id } })).toBeNull();
    expect(await db.opportunity.findUnique({ where: { id: opp.id } })).toBeNull();
    expect(await db.comment.count({ where: { opportunityId: opp.id } })).toBe(0);
    const log = await db.auditLog.findFirstOrThrow({ where: { action: "account.delete", entityId: busy.id } });
    expect(log.summary).toContain("Busy");
    expect(log.summary).toContain("1 opportunity");
    await db.auditLog.delete({ where: { id: log.id } });
  });
});
