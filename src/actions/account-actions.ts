"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { accountSchema } from "@/schemas/account";
import { createAccount, updateAccount } from "@/services/account-service";

export async function createAccountAction(_prev: unknown, formData: FormData) {
  const user = await requireRole("account:write");
  const parsed = accountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const acc = await createAccount(parsed.data, user.id);
  revalidatePath("/accounts");
  redirect(`/accounts/${acc.id}`);
}

export async function updateAccountAction(id: string, _prev: unknown, formData: FormData) {
  await requireRole("account:write");
  const parsed = accountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  await updateAccount(id, parsed.data);
  revalidatePath(`/accounts/${id}`);
  return { ok: true };
}
