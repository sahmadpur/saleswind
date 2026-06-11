import { z } from "zod";

export const accountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  industry: z.string().optional(),
  website: z.preprocess(
    (v) => (typeof v === "string" && v && !/^https?:\/\//i.test(v) ? `https://${v}` : v),
    z.string().url("Enter a valid website").optional().or(z.literal("")),
  ),
  primaryContactName: z.string().optional(),
  primaryContactEmail: z.string().email("Enter a valid email").optional().or(z.literal("")),
  primaryContactPhone: z.string().optional(),
  notes: z.string().optional(),
});

export type AccountInput = z.infer<typeof accountSchema>;
