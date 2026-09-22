"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole, requireUser } from "@/lib/session";
import { isElevated } from "@/lib/domain/permissions";
import { formValues, type FormState } from "@/lib/action-state";
import { taskCreateSchema, taskUpdateSchema } from "@/schemas/task";
import { createTask, deleteTask, setTaskStatus, updateTask } from "@/services/task-service";

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

const statusSchema = z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]);

export async function setTaskStatusAction(id: string, status: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return { error: "Unknown status" };
  try {
    const t = await setTaskStatus(id, parsed.data, user.id, isElevated(user.role));
    revalidate(t.opportunityId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not move task" };
  }
  return {};
}

export async function updateTaskAction(id: string, _prev: unknown, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = taskUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors, values: formValues(formData) };
  try {
    const { task, before } = await updateTask(id, parsed.data, user.id, isElevated(user.role));
    revalidate(task.opportunityId);
    // A task moved between opportunities has to refresh the page it left, too.
    if (before.opportunityId !== task.opportunityId) revalidate(before.opportunityId);
  } catch (e) {
    return { error: { _form: [e instanceof Error ? e.message : "Could not save task"] }, values: formValues(formData) };
  }
  return { ok: true };
}

/** Checkbox toggle used by task lists: Done ↔ To do. */
export async function setTaskDoneAction(id: string, done: boolean) {
  return setTaskStatusAction(id, done ? "DONE" : "TODO");
}

export async function deleteTaskAction(id: string) {
  const user = await requireUser();
  const t = await deleteTask(id, user.id, isElevated(user.role));
  revalidate(t.opportunityId);
}
