"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/session";
import { formValues } from "@/lib/action-state";
import { accountFieldSchema, accountSchema, type AccountField } from "@/schemas/account";
import { createAccount, updateAccount, updateAccountField, updateAccountNotes } from "@/services/account-service";

export async function createAccountAction(_prev: unknown, formData: FormData) {
  const user = await requireRole("account:write");
  const parsed = accountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors, values: formValues(formData) };
  const acc = await createAccount(parsed.data, user.id);
  revalidatePath("/accounts");
  redirect(`/accounts/${acc.id}`);
}

export async function updateAccountAction(id: string, _prev: unknown, formData: FormData) {
  const user = await requireRole("account:write");
  const parsed = accountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors, values: formValues(formData) };
  await updateAccount(id, parsed.data, user.id);
  revalidatePath("/accounts");
  revalidatePath(`/accounts/${id}`);
  return { ok: true };
}

/** Inline cell edit: returns the error instead of throwing so the cell can show it in place. */
export async function updateAccountFieldAction(id: string, field: AccountField, value: string): Promise<{ error?: string }> {
  const user = await requireRole("account:write");
  const parsed = accountFieldSchema.safeParse({ field, value });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid value" };
  try {
    await updateAccountField(id, parsed.data, user.id);
  } catch {
    return { error: "Could not save" };
  }
  revalidatePath("/accounts");
  revalidatePath(`/accounts/${id}`);
  return {};
}

const notesSchema = z.object({ notes: z.string() });

export async function updateAccountNotesAction(id: string, _prev: unknown, formData: FormData) {
  const user = await requireRole("account:write");
  const parsed = notesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors, values: formValues(formData) };
  await updateAccountNotes(id, parsed.data.notes, user.id);
  revalidatePath(`/accounts/${id}`);
  return { ok: true };
}
