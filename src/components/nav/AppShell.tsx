import Link from "next/link";
import type { Role } from "@prisma/client";
import { can } from "@/lib/domain/permissions";

const NAV = [
  { href: "/opportunities", label: "Opportunities", action: null },
  { href: "/accounts", label: "Accounts", action: null },
  { href: "/reports", label: "Reports", action: "reports:view" as const },
  { href: "/dictionary", label: "Dictionary", action: "dictionary:manage" as const },
  { href: "/users", label: "Users", action: "users:manage" as const },
];

export function AppShell({ role, children, bell }: { role: Role; children: React.ReactNode; bell: React.ReactNode }) {
  const items = NAV.filter((i) => !i.action || can(role, i.action));
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r border-neutral-200 bg-white p-4">
        <div className="mb-8 px-2 text-lg font-semibold text-blue-600">Saleswind</div>
        <nav className="space-y-1">
          {items.map((i) => (
            <Link key={i.href} href={i.href}
              className="block rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100">{i.label}</Link>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-end gap-4 border-b border-neutral-200 bg-white px-6">
          {bell}
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
