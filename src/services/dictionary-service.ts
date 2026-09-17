import "server-only";
import { db } from "@/lib/db";
import { audit } from "@/services/audit-service";
import type { Stage } from "@prisma/client";
import type { StatusColor } from "@/lib/status-colors";

export async function addStatus(stage: Stage, label: string, userId: string) {
  return db.$transaction(async (tx) => {
    const s = await tx.status.create({ data: { stage, label } });
    await audit(tx, { userId, action: "status.create", entityType: "status", entityId: s.id, summary: `Added status "${label}" to ${stage}` });
    return s;
  });
}
export async function toggleStatus(id: string, userId: string) {
  return db.$transaction(async (tx) => {
    const s = await tx.status.findUniqueOrThrow({ where: { id } });
    const updated = await tx.status.update({ where: { id }, data: { isActive: !s.isActive } });
    await audit(tx, { userId, action: "status.toggle", entityType: "status", entityId: id, summary: `${updated.isActive ? "Activated" : "Deactivated"} status "${s.label}" (${s.stage})` });
    return updated;
  });
}
export async function setStatusColor(id: string, color: StatusColor, userId: string) {
  return db.$transaction(async (tx) => {
    const s = await tx.status.update({ where: { id }, data: { color } });
    await audit(tx, { userId, action: "status.color", entityType: "status", entityId: id, summary: `Set colour of status "${s.label}" (${s.stage}) to ${color}` });
    return s;
  });
}
export async function renameStatus(id: string, label: string, userId: string) {
  return db.$transaction(async (tx) => {
    const before = await tx.status.findUniqueOrThrow({ where: { id } });
    const s = await tx.status.update({ where: { id }, data: { label } });
    await audit(tx, { userId, action: "status.rename", entityType: "status", entityId: id, summary: `Renamed status "${before.label}" to "${label}" (${s.stage})` });
    return s;
  });
}
export async function addTag(stage: Stage, label: string, userId: string) {
  return db.$transaction(async (tx) => {
    const t = await tx.tag.create({ data: { stage, label } });
    await audit(tx, { userId, action: "tag.create", entityType: "tag", entityId: t.id, summary: `Added tag "${label}" to ${stage}` });
    return t;
  });
}
export async function toggleTag(id: string, userId: string) {
  return db.$transaction(async (tx) => {
    const t = await tx.tag.findUniqueOrThrow({ where: { id } });
    const updated = await tx.tag.update({ where: { id }, data: { isActive: !t.isActive } });
    await audit(tx, { userId, action: "tag.toggle", entityType: "tag", entityId: id, summary: `${updated.isActive ? "Activated" : "Deactivated"} tag "${t.label}" (${t.stage})` });
    return updated;
  });
}
export async function renameTag(id: string, label: string, userId: string) {
  return db.$transaction(async (tx) => {
    const before = await tx.tag.findUniqueOrThrow({ where: { id } });
    const t = await tx.tag.update({ where: { id }, data: { label } });
    await audit(tx, { userId, action: "tag.rename", entityType: "tag", entityId: id, summary: `Renamed tag "${before.label}" to "${label}" (${t.stage})` });
    return t;
  });
}
export async function listVocabularies() {
  const [statuses, tags, definitions] = await Promise.all([
    db.status.findMany({ orderBy: [{ stage: "asc" }, { label: "asc" }] }),
    db.tag.findMany({ orderBy: [{ stage: "asc" }, { label: "asc" }] }),
    db.definition.findMany({ orderBy: { term: "asc" } }),
  ]);
  return { statuses, tags, definitions };
}
export async function upsertDefinition(term: string, definition: string, userId: string) {
  return db.$transaction(async (tx) => {
    const d = await tx.definition.upsert({ where: { term }, update: { definition }, create: { term, definition } });
    await audit(tx, { userId, action: "definition.save", entityType: "definition", entityId: d.id, summary: `Saved definition "${term}"`, details: { definition } });
    return d;
  });
}
