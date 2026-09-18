import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import { after } from "next/server";
import { db } from "@/lib/db";
import { sendPush } from "@/services/push-service";

type Tx = PrismaClient | Prisma.TransactionClient;

export async function notify(tx: Tx, userId: string, opportunityId: string | null, type: string, message: string) {
  const n = await tx.notification.create({ data: { userId, opportunityId, type, message } });
  schedulePush(n.id, userId, { body: message, url: opportunityId ? `/opportunities/${opportunityId}` : type === "task" ? "/tasks" : "/opportunities" });
  return n;
}

/**
 * Web Push once the response is done, so it never slows the request or runs inside the transaction.
 * Skipped if the notification row is gone (its transaction rolled back). Outside a request (seed, tests) there's no push.
 */
function schedulePush(notificationId: string, userId: string, payload: { body: string; url: string }) {
  try {
    after(async () => {
      if (await db.notification.count({ where: { id: notificationId } })) await sendPush(userId, payload);
    });
  } catch {
    // `after` throws outside a request scope.
  }
}

export async function listNotifications(userId: string) {
  return db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 });
}

export async function unreadCount(userId: string) {
  return db.notification.count({ where: { userId, readAt: null } });
}

export async function markAllRead(userId: string) {
  await db.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}
