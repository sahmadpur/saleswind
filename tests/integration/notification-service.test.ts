import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { listNotifications, markAllRead } from "@/services/notification-service";

let userId: string;

beforeAll(async () => {
  const u = await db.user.create({ data: { name: "T", email: `n${Date.now()}@x.com`, passwordHash: "x", role: "AGENT" } });
  userId = u.id;
  await db.notification.createMany({ data: [
    { userId, type: "state", message: "a" },
    { userId, type: "comment", message: "b" },
  ] });
});
afterAll(async () => { await db.notification.deleteMany(); await db.user.deleteMany(); await db.$disconnect(); });

describe("notification-service", () => {
  it("lists unread then marks all read", async () => {
    const before = await listNotifications(userId);
    expect(before.filter((n) => !n.readAt).length).toBe(2);
    await markAllRead(userId);
    const after = await listNotifications(userId);
    expect(after.filter((n) => !n.readAt).length).toBe(0);
  });
});
