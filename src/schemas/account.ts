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

/** One cell edited inline in the accounts table. */
export const accountFieldSchema = z.discriminatedUnion("field", [
  z.object({ field: z.literal("name"), value: z.string().trim().min(1, "Name is required") }),
  z.object({ field: z.literal("industry"), value: z.string().trim() }),
  z.object({ field: z.literal("primaryContactName"), value: z.string().trim() }),
  z.object({ field: z.literal("primaryContactEmail"), value: z.union([z.literal(""), z.string().email("Enter a valid email")]) }),
  z.object({ field: z.literal("primaryContactPhone"), value: z.string().trim() }),
  z.object({
    field: z.literal("website"),
    value: z.preprocess(
      (v) => (typeof v === "string" && v && !/^https?:\/\//i.test(v) ? `https://${v}` : v),
      z.union([z.literal(""), z.string().url("Enter a valid website")]),
    ),
  }),
]);

export type AccountFieldInput = z.infer<typeof accountFieldSchema>;
export type AccountField = AccountFieldInput["field"];
