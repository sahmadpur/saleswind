"use server";
import { signOut } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { passwordChangeSchema } from "@/schemas/user";
import { changePassword, InvalidPasswordError } from "@/services/user-service";

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function changePasswordAction(_prev: unknown, formData: FormData) {
  const user = await requireUser();
  const parsed = passwordChangeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  try {
    await changePassword(user.id, parsed.data.currentPassword, parsed.data.newPassword);
  } catch (e) {
    if (e instanceof InvalidPasswordError) {
      return { error: { currentPassword: ["Current password is incorrect"] } };
    }
    throw e;
  }
  return { ok: true };
}
