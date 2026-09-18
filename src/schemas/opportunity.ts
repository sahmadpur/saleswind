import { z } from "zod";

const STAGES = ["PROSPECT", "SALES", "CONTRACT", "PROJECT"] as const;

/** Number field that must be filled in: coerce would otherwise turn "" into 0. */
const requiredNumber = (message: string) => z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number({ error: message }));

/** New opportunities must be complete: every field, a status and at least one tag. */
export const opportunityCreateSchema = z.object({
  accountId: z.string().min(1, "Select an account"),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),
  accountableId: z.string().min(1, "Select who is accountable"),
  stage: z.enum(STAGES, { error: "Select a stage" }),
  statusId: z.string().min(1, "Select a status"),
  tagIds: z.array(z.string().min(1)).min(1, "Select at least one tag"),
  revenue: requiredNumber("PR is required").pipe(z.number().min(0, "Must be 0 or more")),
  marginPct: requiredNumber("MR is required").pipe(z.number().min(0, "Must be 0–100").max(100, "Must be 0–100")),
});

export const opportunityUpdateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  accountableId: z.string().min(1, "Select who is accountable"),
  statusId: z.string().optional(),
  revenue: z.coerce.number().min(0),
  marginPct: z.coerce.number().min(0).max(100),
});

/** One cell edited inline in the opportunities table. */
export const opportunityFieldSchema = z.discriminatedUnion("field", [
  z.object({ field: z.literal("title"), value: z.string().trim().min(1, "Title is required") }),
  z.object({ field: z.literal("statusId"), value: z.string() }),
  z.object({ field: z.literal("accountableId"), value: z.string().min(1, "Select who is accountable") }),
  z.object({ field: z.literal("revenue"), value: z.coerce.number({ error: "Enter a number" }).min(0, "Must be 0 or more") }),
  z.object({ field: z.literal("marginPct"), value: z.coerce.number({ error: "Enter a number" }).min(0, "Must be 0–100").max(100, "Must be 0–100") }),
]);

/** Service input: the form schema enforces completeness; the service itself also accepts partial data (seed, tests). */
export type OpportunityCreateInput = {
  accountId: string; title: string; description?: string; accountableId: string;
  stage?: (typeof STAGES)[number]; statusId?: string; tagIds?: string[]; revenue: number; marginPct: number;
};
export type OpportunityUpdateInput = z.infer<typeof opportunityUpdateSchema>;
export type OpportunityFieldInput = z.infer<typeof opportunityFieldSchema>;
export type EditableField = OpportunityFieldInput["field"];
