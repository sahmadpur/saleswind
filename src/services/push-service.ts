import "server-only";
import webpush from "web-push";
import { db } from "@/lib/db";

export type PushPayload = { body: string; url: string };

/** Public key for the browser's subscribe call; null when push isn't configured. */
export const vapidPublicKey = () => process.env.VAPID_PUBLIC_KEY || null;

let configured: boolean | undefined;
function ready(): boolean {
  if (configured === undefined) {
    const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
    configured = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
    if (configured) webpush.setVapidDetails(VAPID_SUBJECT || "mailto:admin@saleswind.local", VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
  }
  return configured;
}

export async function savePushSubscription(userId: string, sub: { endpoint: string; p256dh: string; auth: string }, userAgent: string | null) {
  // An endpoint belongs to one browser; re-subscribing from another account moves it.
  await db.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { userId, ...sub, userAgent },
    update: { userId, p256dh: sub.p256dh, auth: sub.auth, userAgent },
  });
}

export async function deletePushSubscription(userId: string, endpoint: string) {
  await db.pushSubscription.deleteMany({ where: { userId, endpoint } });
}

/** Sends to every browser the user enabled. Expired subscriptions (404/410) are removed. Never throws. */
export async function sendPush(userId: string, payload: PushPayload): Promise<number> {
  if (!ready()) return 0;
  const user = await db.user.findUnique({ where: { id: userId }, select: { blockedAt: true, pushSubscriptions: true } });
  if (!user || user.blockedAt) return 0;
  let sent = 0;
  await Promise.all(user.pushSubscriptions.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 60 * 60 * 24 });
      sent++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
      else console.error("[push] send failed", status ?? e);
    }
  }));
  return sent;
}
