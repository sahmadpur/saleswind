"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { opportunityCreateSchema, opportunityUpdateSchema } from "@/schemas/opportunity";
import { createOpportunity, updateOpportunity, transitionOpportunity, attachTag, detachTag, type TransitionKind } from "@/services/opportunity-service";

export async function createOpportunityAction(_prev: unknown, formData: FormData) {
  const user = await requireRole("opportunity:write");
  const parsed = opportunityCreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const o = await createOpportunity(parsed.data, user.id);
  revalidatePath("/opportunities");
  redirect(`/opportunities/${o.id}`);
}

export async function updateOpportunityAction(id: string, _prev: unknown, formData: FormData) {
  const user = await requireRole("opportunity:write");
  const parsed = opportunityUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  await updateOpportunity(id, parsed.data, user.id);
  revalidatePath(`/opportunities/${id}`);
  return { ok: true };
}

export async function transitionAction(id: string, kind: TransitionKind, reason?: string) {
  const user = await requireRole("opportunity:write");
  await transitionOpportunity(id, kind, user.id, reason);
  revalidatePath(`/opportunities/${id}`);
  revalidatePath("/opportunities");
}

export async function attachTagAction(opportunityId: string, tagId: string) {
  const user = await requireRole("opportunity:write");
  await attachTag(opportunityId, tagId, user.id);
  revalidatePath(`/opportunities/${opportunityId}`);
}

export async function detachTagAction(opportunityId: string, tagId: string) {
  const user = await requireRole("opportunity:write");
  await detachTag(opportunityId, tagId, user.id);
  revalidatePath(`/opportunities/${opportunityId}`);
}
