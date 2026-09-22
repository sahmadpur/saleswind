import type { Role } from "@prisma/client";

export type Action =
  | "opportunity:write"
  | "account:write"
  | "directory:write"
  | "comment:write"
  | "dashboard:view"
  | "meetings:viewAll"
  | "dictionary:manage"
  | "users:manage"
  | "audit:view";

const MATRIX: Record<Role, Action[]> = {
  AGENT: ["opportunity:write", "account:write", "directory:write", "comment:write"],
  MANAGER: ["opportunity:write", "account:write", "directory:write", "comment:write", "dashboard:view", "meetings:viewAll"],
  ADMIN: ["opportunity:write", "account:write", "directory:write", "comment:write", "dashboard:view", "meetings:viewAll", "dictionary:manage", "users:manage", "audit:view"],
};

export function can(role: Role, action: Action): boolean {
  return MATRIX[role].includes(action);
}

/** Admins and managers: the "sees and edits everyone's work" tier. */
export function isElevated(role: Role): boolean {
  return role === "ADMIN" || role === "MANAGER";
}
