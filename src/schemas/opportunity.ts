import { z } from "zod";

export const opportunityCreateSchema = z.object({
  accountId: z.string().min(1, "Select an account"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  accountableId: z.string().min(1, "Select who is accountable"),
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

export type OpportunityCreateInput = z.infer<typeof opportunityCreateSchema>;
export type OpportunityUpdateInput = z.infer<typeof opportunityUpdateSchema>;
