"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { userCreateSchema } from "@/schemas/user";
import { createUser } from "@/services/user-service";

export async function createUserAction(_prev: unknown, formData: FormData) {
  await requireRole("users:manage");
  const parsed = userCreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  await createUser(parsed.data);
  revalidatePath("/users");
  return { ok: true };
}
