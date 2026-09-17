import type { DirectoryKind } from "@prisma/client";
import { ref } from "@/lib/format";

/** Per-kind labels and routes for the Vendors / Staff / Partners directories. */
export const DIRECTORY = {
  VENDOR: { slug: "vendors", title: "Vendors", singular: "vendor", prefix: "VEN", icon: "local_shipping", contactLabel: "Contact person", namePlaceholder: "Dell Technologies" },
  STAFF: { slug: "staff", title: "Staff", singular: "staff member", prefix: "STF", icon: "badge", contactLabel: "Position", namePlaceholder: "Jane Doe" },
  PARTNER: { slug: "partners", title: "Partners", singular: "partner", prefix: "PRT", icon: "handshake", contactLabel: "Contact person", namePlaceholder: "Northwind Integrators" },
} as const satisfies Record<DirectoryKind, unknown>;

export const directoryRef = (kind: DirectoryKind, n: number) => ref(DIRECTORY[kind].prefix, n);
