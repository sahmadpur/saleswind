import { z } from "zod";
export const userCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "MANAGER", "AGENT"]),
});
export type UserCreateInput = z.infer<typeof userCreateSchema>;

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
