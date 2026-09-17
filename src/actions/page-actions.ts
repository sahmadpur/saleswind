"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import type { FormState } from "@/lib/action-state";
import { savePage } from "@/services/page-service";

export async function saveInstructionsAction(_prev: unknown, formData: FormData): Promise<FormState> {
  const user = await requireRole("dictionary:manage");
  await savePage("instructions", String(formData.get("body") ?? ""), user.id);
  revalidatePath("/instructions");
  return { ok: true };
}
