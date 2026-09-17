"use server";
import { revalidatePath } from "next/cache";
import { requireRole, requireUser } from "@/lib/session";
import { formValues, type FormState } from "@/lib/action-state";
import { taskCreateSchema } from "@/schemas/task";
import { createTask, deleteTask, setTaskDone } from "@/services/task-service";

function revalidate(opportunityId?: string | null) {
  revalidatePath("/tasks");
  if (opportunityId) revalidatePath(`/opportunities/${opportunityId}`);
}

export async function createTaskAction(_prev: unknown, formData: FormData): Promise<FormState> {
  const user = await requireRole("opportunity:write");
  const parsed = taskCreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors, values: formValues(formData) };
  try {
    const t = await createTask(parsed.data, user.id);
    revalidate(t.opportunityId);
  } catch (e) {
    return { error: { _form: [e instanceof Error ? e.message : "Could not add task"] }, values: formValues(formData) };
  }
  return { ok: true };
}

const elevated = (role: string) => role === "ADMIN" || role === "MANAGER";

export async function setTaskDoneAction(id: string, done: boolean) {
  const user = await requireUser();
  const t = await setTaskDone(id, done, user.id, elevated(user.role));
  revalidate(t.opportunityId);
}

export async function deleteTaskAction(id: string) {
  const user = await requireUser();
  const t = await deleteTask(id, user.id, elevated(user.role));
  revalidate(t.opportunityId);
}
