import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = PrismaClient | Prisma.TransactionClient;

export async function notify(tx: Tx, userId: string, opportunityId: string, type: string, message: string) {
  return tx.notification.create({ data: { userId, opportunityId, type, message } });
}
