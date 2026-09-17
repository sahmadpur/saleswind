import type { Role } from "@prisma/client";

export type Action =
  | "opportunity:write"
  | "account:write"
  | "comment:write"
  | "reports:view"
  | "dictionary:manage"
  | "users:manage"
  | "audit:view";

const MATRIX: Record<Role, Action[]> = {
  AGENT: ["opportunity:write", "account:write", "comment:write"],
  MANAGER: ["opportunity:write", "account:write", "comment:write", "reports:view"],
  ADMIN: ["opportunity:write", "account:write", "comment:write", "reports:view", "dictionary:manage", "users:manage", "audit:view"],
};

export function can(role: Role, action: Action): boolean {
  return MATRIX[role].includes(action);
}
