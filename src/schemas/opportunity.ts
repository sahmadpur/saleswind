import { z } from "zod";

const STAGES = ["PROSPECT", "SALES", "CONTRACT", "PROJECT"] as const;

export const opportunityCreateSchema = z.object({
  accountId: z.string().min(1, "Select an account"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  accountableId: z.string().min(1, "Select who is accountable"),
  stage: z.enum(STAGES).default("PROSPECT"),
  statusId: z.string().optional(),
  revenue: z.coerce.number().min(0),
  marginPct: z.coerce.number().min(0).max(100),
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

export type OpportunityCreateInput = Omit<z.infer<typeof opportunityCreateSchema>, "stage"> & { stage?: (typeof STAGES)[number] };
export type OpportunityUpdateInput = z.infer<typeof opportunityUpdateSchema>;
export type OpportunityFieldInput = z.infer<typeof opportunityFieldSchema>;
export type EditableField = OpportunityFieldInput["field"];
