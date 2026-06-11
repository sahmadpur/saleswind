"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/session";
import { formValues } from "@/lib/action-state";
import { accountSchema } from "@/schemas/account";
import { createAccount, updateAccount, updateAccountNotes } from "@/services/account-service";

export async function createAccountAction(_prev: unknown, formData: FormData) {
  const user = await requireRole("account:write");
  const parsed = accountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors, values: formValues(formData) };
  const acc = await createAccount(parsed.data, user.id);
  revalidatePath("/accounts");
  redirect(`/accounts/${acc.id}`);
}

export async function updateAccountAction(id: string, _prev: unknown, formData: FormData) {
  await requireRole("account:write");
  const parsed = accountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors, values: formValues(formData) };
  await updateAccount(id, parsed.data);
  revalidatePath(`/accounts/${id}`);
  return { ok: true };
}

const notesSchema = z.object({ notes: z.string() });

export async function updateAccountNotesAction(id: string, _prev: unknown, formData: FormData) {
  await requireRole("account:write");
  const parsed = notesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors, values: formValues(formData) };
  await updateAccountNotes(id, parsed.data.notes);
  revalidatePath(`/accounts/${id}`);
  return { ok: true };
}
