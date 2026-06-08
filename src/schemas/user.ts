import { z } from "zod";
export const userCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "MANAGER", "AGENT"]),
});
export type UserCreateInput = z.infer<typeof userCreateSchema>;
