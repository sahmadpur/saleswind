import "server-only";
import { db } from "@/lib/db";
import type { State } from "@prisma/client";

export async function addStatus(state: State, label: string) {
  return db.status.create({ data: { state, label } });
}
export async function toggleStatus(id: string) {
  const s = await db.status.findUniqueOrThrow({ where: { id } });
  return db.status.update({ where: { id }, data: { isActive: !s.isActive } });
}
export async function renameStatus(id: string, label: string) {
  return db.status.update({ where: { id }, data: { label } });
}
export async function addTag(state: State, label: string) {
  return db.tag.create({ data: { state, label } });
}
export async function toggleTag(id: string) {
  const t = await db.tag.findUniqueOrThrow({ where: { id } });
  return db.tag.update({ where: { id }, data: { isActive: !t.isActive } });
}
export async function renameTag(id: string, label: string) {
  return db.tag.update({ where: { id }, data: { label } });
}
export async function listVocabularies() {
  const [statuses, tags, definitions] = await Promise.all([
    db.status.findMany({ orderBy: [{ state: "asc" }, { label: "asc" }] }),
    db.tag.findMany({ orderBy: [{ state: "asc" }, { label: "asc" }] }),
    db.definition.findMany({ orderBy: { term: "asc" } }),
  ]);
  return { statuses, tags, definitions };
}
export async function upsertDefinition(term: string, definition: string) {
  return db.definition.upsert({ where: { term }, update: { definition }, create: { term, definition } });
}
