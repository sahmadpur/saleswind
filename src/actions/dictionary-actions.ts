"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import type { State } from "@prisma/client";
import { addStatus, toggleStatus, addTag, toggleTag, upsertDefinition } from "@/services/dictionary-service";

export async function addStatusAction(formData: FormData) {
  await requireRole("dictionary:manage");
  await addStatus(formData.get("state") as State, String(formData.get("label")));
  revalidatePath("/dictionary");
}
export async function toggleStatusAction(id: string) {
  await requireRole("dictionary:manage");
  await toggleStatus(id);
  revalidatePath("/dictionary");
}
export async function addTagAction(formData: FormData) {
  await requireRole("dictionary:manage");
  await addTag(formData.get("state") as State, String(formData.get("label")));
  revalidatePath("/dictionary");
}
export async function toggleTagAction(id: string) {
  await requireRole("dictionary:manage");
  await toggleTag(id);
  revalidatePath("/dictionary");
}
export async function upsertDefinitionAction(formData: FormData) {
  await requireRole("dictionary:manage");
  await upsertDefinition(String(formData.get("term")), String(formData.get("definition")));
  revalidatePath("/dictionary");
}
