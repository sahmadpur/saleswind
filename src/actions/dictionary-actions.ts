"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import type { Stage } from "@prisma/client";
import { isStatusColor } from "@/lib/status-colors";
import { addStatus, setStatusColor, toggleStatus, addTag, toggleTag, upsertDefinition } from "@/services/dictionary-service";

export async function addStatusAction(formData: FormData) {
  const user = await requireRole("dictionary:manage");
  await addStatus(formData.get("stage") as Stage, String(formData.get("label")), user.id);
  revalidatePath("/dictionary");
}
export async function toggleStatusAction(id: string) {
  const user = await requireRole("dictionary:manage");
  await toggleStatus(id, user.id);
  revalidatePath("/dictionary");
}
export async function setStatusColorAction(id: string, color: string) {
  const user = await requireRole("dictionary:manage");
  if (!isStatusColor(color)) throw new Error("Unknown colour");
  await setStatusColor(id, color, user.id);
  revalidatePath("/dictionary");
  revalidatePath("/opportunities");
}
export async function addTagAction(formData: FormData) {
  const user = await requireRole("dictionary:manage");
  await addTag(formData.get("stage") as Stage, String(formData.get("label")), user.id);
  revalidatePath("/dictionary");
}
export async function toggleTagAction(id: string) {
  const user = await requireRole("dictionary:manage");
  await toggleTag(id, user.id);
  revalidatePath("/dictionary");
}
export async function upsertDefinitionAction(formData: FormData) {
  const user = await requireRole("dictionary:manage");
  await upsertDefinition(String(formData.get("term")), String(formData.get("definition")), user.id);
  revalidatePath("/dictionary");
}
