import { z } from "zod";

export const opportunityCreateSchema = z.object({
  accountId: z.string().min(1),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  ownerId: z.string().min(1),
  revenue: z.coerce.number().min(0),
  marginPct: z.coerce.number().min(0).max(100),
  meetingAt: z.string().optional(),
});

export const opportunityUpdateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  ownerId: z.string().min(1),
  statusId: z.string().optional(),
  revenue: z.coerce.number().min(0),
  marginPct: z.coerce.number().min(0).max(100),
  meetingAt: z.string().optional(),
});

export type OpportunityCreateInput = z.infer<typeof opportunityCreateSchema>;
export type OpportunityUpdateInput = z.infer<typeof opportunityUpdateSchema>;
