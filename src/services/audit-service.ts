import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";

type Tx = PrismaClient | Prisma.TransactionClient;

export type AuditEntry = {
  userId: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  summary: string;
  details?: Prisma.InputJsonValue;
};

/** Client IP and user agent of the current request; empty outside a request (tests, scripts). */
async function requestMeta(): Promise<{ ip?: string; userAgent?: string }> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const ip = h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? undefined;
    return { ip, userAgent: h.get("user-agent")?.slice(0, 300) ?? undefined };
  } catch {
    return {};
  }
}

export async function audit(tx: Tx, entry: AuditEntry) {
  return tx.auditLog.create({ data: { ...entry, ...(await requestMeta()) } });
}

export const AUDIT_PAGE_SIZE = 50;

export type AuditFilters = { userId?: string; action?: string; entityType?: string; from?: string; to?: string };

export async function listAudit(filters: AuditFilters, page: number) {
  const createdAt: Prisma.DateTimeFilter = {};
  if (filters.from) createdAt.gte = new Date(`${filters.from}T00:00:00Z`);
  if (filters.to) createdAt.lt = new Date(new Date(`${filters.to}T00:00:00Z`).getTime() + 86_400_000);
  const where: Prisma.AuditLogWhereInput = {
    ...(filters.userId && { userId: filters.userId }),
    ...(filters.action && { action: filters.action }),
    ...(filters.entityType && { entityType: filters.entityType }),
    ...((filters.from || filters.to) && { createdAt }),
  };
  const [rows, total, actions, entityTypes] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * AUDIT_PAGE_SIZE, take: AUDIT_PAGE_SIZE }),
    db.auditLog.count({ where }),
    db.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
    db.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true }, where: { entityType: { not: null } }, orderBy: { entityType: "asc" } }),
  ]);
  return {
    rows, total,
    actions: actions.map((a) => a.action),
    entityTypes: entityTypes.map((e) => e.entityType!),
  };
}
