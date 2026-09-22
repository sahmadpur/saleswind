import { z } from "zod";

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1, "What needs doing?").max(300),
  dueDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")]).optional(),
  assigneeId: z.string().optional(),
  opportunityId: z.string().optional(),
});

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;

/** Editing an existing task. Status moves through its own action, so it isn't here. */
export const taskUpdateSchema = taskCreateSchema.extend({
  assigneeId: z.string().min(1, "Pick an assignee"),
});

export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
