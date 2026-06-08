import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { createOpportunity } from "@/services/opportunity-service";
import { addComment, deleteComment, listComments } from "@/services/comment-service";

let userId: string, accountId: string;

beforeAll(async () => {
  const u = await db.user.create({ data: { name: "T", email: `c${Date.now()}@x.com`, passwordHash: "x", role: "AGENT" } });
  userId = u.id;
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
    await deleteComment(c.id);
    expect((await listComments(o.id)).length).toBe(0);
    expect(await db.comment.count({ where: { id: c.id } })).toBe(1);
  });
});
