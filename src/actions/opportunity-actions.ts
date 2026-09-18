"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { formValues } from "@/lib/action-state";
import { opportunityCreateSchema, opportunityFieldSchema, opportunityUpdateSchema, type EditableField } from "@/schemas/opportunity";
import { createOpportunity, updateOpportunity, updateOpportunityField, setOpportunityStage, transitionOpportunity, attachTag, detachTag, type TransitionKind } from "@/services/opportunity-service";

export async function createOpportunityAction(_prev: unknown, formData: FormData) {
  const user = await requireRole("opportunity:write");
  const tagIds = formData.getAll("tagIds").filter((v): v is string => typeof v === "string");
  // Tags are multi-valued; echo them back comma-joined so the form can restore the selection.
  const values = { ...formValues(formData), tagIds: tagIds.join(",") };
  const parsed = opportunityCreateSchema.safeParse({ ...Object.fromEntries(formData), tagIds });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors, values };
  let id: string;
  try {
    const o = await createOpportunity(parsed.data, user.id);
    id = o.id;
  } catch (e) {
    return { error: { _form: [`Could not save — ${e instanceof Error ? e.message : "unexpected error"}`] }, values };
  }
  revalidatePath("/opportunities");
  redirect(`/opportunities/${id}`);
}

export async function updateOpportunityAction(id: string, _prev: unknown, formData: FormData) {
  const user = await requireRole("opportunity:write");
  const parsed = opportunityUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors, values: formValues(formData) };
  try {
    await updateOpportunity(id, parsed.data, user.id);
  } catch (e) {
    return { error: { _form: [`Could not save — ${e instanceof Error ? e.message : "unexpected error"}`] }, values: formValues(formData) };
  }
  revalidatePath(`/opportunities/${id}`);
  return { ok: true };
}

/** Inline table edit. Returns an error message instead of throwing so the cell can show it. */
export async function updateOpportunityFieldAction(id: string, field: EditableField, value: string): Promise<{ error?: string }> {
  const user = await requireRole("opportunity:write");
  const parsed = opportunityFieldSchema.safeParse({ field, value });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid value" };
  try {
    if (parsed.data.field === "stage") await setOpportunityStage(id, parsed.data.value, user.id);
    else await updateOpportunityField(id, parsed.data, user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save" };
  }
  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${id}`);
  return {};
}

export async function transitionAction(id: string, kind: TransitionKind) {
  const user = await requireRole("opportunity:write");
  await transitionOpportunity(id, kind, user.id);
  revalidatePath(`/opportunities/${id}`);
  revalidatePath("/opportunities");
}

export async function attachTagAction(opportunityId: string, tagId: string): Promise<{ error?: string }> {
  const user = await requireRole("opportunity:write");
  try {
    await attachTag(opportunityId, tagId, user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not add tag" };
  }
  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${opportunityId}`);
  return {};
}

export async function detachTagAction(opportunityId: string, tagId: string): Promise<{ error?: string }> {
  const user = await requireRole("opportunity:write");
  try {
    await detachTag(opportunityId, tagId, user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not remove tag" };
  }
  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${opportunityId}`);
  return {};
}
