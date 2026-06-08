import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { createOpportunity } from "@/services/opportunity-service";
import { addComment, deleteComment, listComments } from "@/services/comment-service";

let userId: string, otherUserId: string, adminUserId: string, accountId: string;

beforeAll(async () => {
  const u = await db.user.create({ data: { name: "T", email: `c${Date.now()}@x.com`, passwordHash: "x", role: "AGENT" } });
  userId = u.id;
  const other = await db.user.create({ data: { name: "O", email: `o${Date.now()}@x.com`, passwordHash: "x", role: "AGENT" } });
  otherUserId = other.id;
  const admin = await db.user.create({ data: { name: "A", email: `a${Date.now()}@x.com`, passwordHash: "x", role: "ADMIN" } });
  adminUserId = admin.id;
  accountId = (await db.account.create({ data: { name: "A", createdById: userId } })).id;
});
afterAll(async () => {
  await db.comment.deleteMany(); await db.notification.deleteMany(); await db.activityLog.deleteMany();
  await db.opportunity.deleteMany(); await db.account.deleteMany(); await db.user.deleteMany(); await db.$disconnect();
});

describe("comment-service", () => {
  it("adds a comment then soft-deletes it (excluded from list, row remains)", async () => {
    const o = await createOpportunity({ accountId, title: "T", ownerId: userId, revenue: 1, marginPct: 1 }, userId);
    const c = await addComment(o.id, "Hello", userId);
    expect((await listComments(o.id)).length).toBe(1);
    await deleteComment(c.id, userId, "AGENT");
    expect((await listComments(o.id)).length).toBe(0);
    expect(await db.comment.count({ where: { id: c.id } })).toBe(1);
  });

  it("rejects deletion by a different non-elevated user", async () => {
    const o = await createOpportunity({ accountId, title: "T2", ownerId: userId, revenue: 1, marginPct: 1 }, userId);
    const c = await addComment(o.id, "Hello", userId);
    await expect(deleteComment(c.id, otherUserId, "AGENT")).rejects.toThrow("Forbidden");
    expect((await listComments(o.id)).length).toBe(1);
  });

  it("allows an ADMIN to delete someone else's comment", async () => {
    const o = await createOpportunity({ accountId, title: "T3", ownerId: userId, revenue: 1, marginPct: 1 }, userId);
    const c = await addComment(o.id, "Hello", userId);
    await deleteComment(c.id, adminUserId, "ADMIN");
    expect((await listComments(o.id)).length).toBe(0);
    expect(await db.comment.count({ where: { id: c.id } })).toBe(1);
  });
});
