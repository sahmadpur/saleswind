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

/** One cell edited inline in a directory table. */
export const directoryFieldSchema = z.discriminatedUnion("field", [
  z.object({ field: z.literal("name"), value: z.string().trim().min(1, "Name is required") }),
  z.object({ field: z.literal("contactName"), value: z.string().trim() }),
  z.object({ field: z.literal("email"), value: z.union([z.literal(""), z.string().email("Enter a valid email")]) }),
  z.object({ field: z.literal("phone"), value: z.string().trim() }),
  z.object({
    field: z.literal("website"),
    value: z.preprocess(
      (v) => (typeof v === "string" && v && !/^https?:\/\//i.test(v) ? `https://${v}` : v),
      z.union([z.literal(""), z.string().url("Enter a valid website")]),
    ),
  }),
]);

export type DirectoryFieldInput = z.infer<typeof directoryFieldSchema>;
export type DirectoryField = DirectoryFieldInput["field"];
