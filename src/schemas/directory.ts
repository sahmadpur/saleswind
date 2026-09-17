import { z } from "zod";

export const directorySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  contactName: z.string().optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.preprocess(
    (v) => (typeof v === "string" && v && !/^https?:\/\//i.test(v) ? `https://${v}` : v),
    z.string().url("Enter a valid website").optional().or(z.literal("")),
  ),
  notes: z.string().optional(),
});

export type DirectoryInput = z.infer<typeof directorySchema>;
