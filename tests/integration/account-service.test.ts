import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { createAccount, listAccounts } from "@/services/account-service";

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
});
