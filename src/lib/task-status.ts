export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"] as const;
export type TaskStatusValue = (typeof TASK_STATUSES)[number];

/** Labels and literal Tailwind classes per task status (board columns, pills). */
export const TASK_STATUS: Record<TaskStatusValue, { label: string; bar: string; dot: string; pill: string }> = {
  TODO: { label: "To do", bar: "bg-ggrey-2", dot: "bg-ggrey-2", pill: "bg-ghover text-ggrey" },
  IN_PROGRESS: { label: "In progress", bar: "bg-gsales", dot: "bg-gsales", pill: "bg-gsales-50 text-gsales" },
  DONE: { label: "Done", bar: "bg-ggreen", dot: "bg-ggreen", pill: "bg-ggreen-50 text-ggreen" },
  CANCELLED: { label: "Cancelled", bar: "bg-gred", dot: "bg-gred", pill: "bg-gred-50 text-gred" },
};
