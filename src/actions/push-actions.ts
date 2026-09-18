"use server";
import { headers } from "next/headers";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { deletePushSubscription, savePushSubscription, sendPush } from "@/services/push-service";

const subSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export async function subscribePushAction(sub: unknown): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = subSchema.safeParse(sub);
  if (!parsed.success) return { error: "Invalid subscription" };
  const ua = (await headers()).get("user-agent");
  await savePushSubscription(user.id, { endpoint: parsed.data.endpoint, ...parsed.data.keys }, ua);
  return {};
}

export async function unsubscribePushAction(endpoint: string) {
  const user = await requireUser();
  await deletePushSubscription(user.id, endpoint);
}

export async function testPushAction(): Promise<{ sent: number }> {
  const user = await requireUser();
  return { sent: await sendPush(user.id, { body: "Notifications are working.", url: "/settings" }) };
}
