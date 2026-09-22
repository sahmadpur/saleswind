import { z } from "zod";
export const userCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "MANAGER", "AGENT"]),
});
export type UserCreateInput = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email"),
  role: z.enum(["ADMIN", "MANAGER", "AGENT"]),
  // Blank keeps the current password.
  password: z.union([z.literal(""), z.string().min(8, "At least 8 characters")]).optional(),
});
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirm: z.string().min(1),
  })
  .refine((d) => d.newPassword === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

/** One cell edited inline in the users table. Email and password stay behind the full dialog. */
export const userFieldSchema = z.discriminatedUnion("field", [
  z.object({ field: z.literal("name"), value: z.string().trim().min(1, "Name is required") }),
  z.object({ field: z.literal("role"), value: z.enum(["ADMIN", "MANAGER", "AGENT"]) }),
]);
export type UserFieldInput = z.infer<typeof userFieldSchema>;
export type UserField = UserFieldInput["field"];
