import type { ListSort } from "@/lib/table";

/** Case-insensitive text sort that pushes blanks last regardless of direction is not worth the complexity: empty sorts first. */
const text = (v: string | null | undefined) => (v ?? "").toLowerCase();

export type AccountSortKey = "ref" | "name" | "industry" | "contact" | "email" | "phone" | "website" | "opportunities";
type AccountRow = {
  number: number; name: string; industry: string | null; website: string | null;
  primaryContactName: string | null; primaryContactEmail: string | null; primaryContactPhone: string | null;
  _count: { opportunities: number };
};

export const ACCOUNT_SORT: ListSort<AccountRow, AccountSortKey> = {
  keys: ["ref", "name", "industry", "contact", "email", "phone", "website", "opportunities"],
  fallback: "ref",
  defaultDir: { ref: "desc", name: "asc", industry: "asc", contact: "asc", email: "asc", phone: "asc", website: "asc", opportunities: "desc" },
  valueOf: (a, k) => {
    switch (k) {
      case "ref": return a.number;
      case "name": return text(a.name);
      case "industry": return text(a.industry);
      case "contact": return text(a.primaryContactName);
      case "email": return text(a.primaryContactEmail);
      case "phone": return text(a.primaryContactPhone);
      case "website": return text(a.website);
      case "opportunities": return a._count.opportunities;
    }
  },
};

export type DirectorySortKey = "ref" | "name" | "contact" | "email" | "phone" | "website";
type DirectoryRow = { number: number; name: string; contactName: string | null; email: string | null; phone: string | null; website: string | null };

export const DIRECTORY_SORT: ListSort<DirectoryRow, DirectorySortKey> = {
  keys: ["ref", "name", "contact", "email", "phone", "website"],
  fallback: "ref",
  defaultDir: { ref: "desc", name: "asc", contact: "asc", email: "asc", phone: "asc", website: "asc" },
  valueOf: (e, k) => {
    switch (k) {
      case "ref": return e.number;
      case "name": return text(e.name);
      case "contact": return text(e.contactName);
      case "email": return text(e.email);
      case "phone": return text(e.phone);
      case "website": return text(e.website);
    }
  },
};

export type UserSortKey = "name" | "email" | "role" | "status" | "created";
type UserRow = { name: string; email: string; role: string; blockedAt: Date | null; createdAt: Date };

export const USER_SORT: ListSort<UserRow, UserSortKey> = {
  keys: ["name", "email", "role", "status", "created"],
  fallback: "name",
  defaultDir: { name: "asc", email: "asc", role: "asc", status: "asc", created: "desc" },
  valueOf: (u, k) => {
    switch (k) {
      case "name": return text(u.name);
      case "email": return text(u.email);
      case "role": return u.role;
      case "status": return u.blockedAt ? 1 : 0;
      case "created": return u.createdAt.getTime();
    }
  },
};
