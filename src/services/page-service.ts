import "server-only";
import { db } from "@/lib/db";
import { audit } from "@/services/audit-service";

export const getPage = (key: string) => db.page.findUnique({ where: { key } });

export async function savePage(key: string, body: string, userId: string) {
  return db.$transaction(async (tx) => {
    const p = await tx.page.upsert({ where: { key }, update: { body, updatedById: userId }, create: { key, body, updatedById: userId } });
    await audit(tx, { userId, action: "page.save", entityType: "page", entityId: key, summary: `Updated the ${key} page` });
    return p;
  });
}
