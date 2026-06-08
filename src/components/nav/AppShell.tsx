import type { Role } from "@prisma/client";
import { can } from "@/lib/domain/permissions";
import { SideNav } from "@/components/nav/SideNav";
import { AccountMenu } from "@/components/nav/AccountMenu";

const NAV = [
  { href: "/opportunities", label: "Opportunities", icon: "monitoring", action: null },
  { href: "/accounts", label: "Accounts", icon: "domain", action: null },
  { href: "/reports", label: "Reports", icon: "bar_chart", action: "reports:view" as const },
  { href: "/dictionary", label: "Dictionary", icon: "menu_book", action: "dictionary:manage" as const },
  { href: "/users", label: "Users", icon: "group", action: "users:manage" as const },
];

export function AppShell({
  role,
  userName,
  userEmail,
  children,
  bell,
}: {
  role: Role;
  userName: string;
  userEmail: string;
  children: React.ReactNode;
  bell: React.ReactNode;
}) {
  const items = NAV.filter((i) => !i.action || can(role, i.action)).map(
    ({ href, label, icon }) => ({ href, label, icon }),
  );

  return (
    <div className="min-h-screen">
      {/* Top app bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gline-2 bg-gsurface px-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full text-ggrey transition-colors hover:bg-ghover">
            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>menu</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span
              className="grid h-8 w-8 place-items-center rounded-lg bg-gblue text-white shadow-g1"
              aria-hidden
            >
              <span className="material-symbols-outlined fill" style={{ fontSize: 20 }}>air</span>
            </span>
            <span className="text-[1.375rem] font-normal tracking-tight text-ggrey">
              Saleswind
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {bell}
          <span className="mx-1 h-6 w-px bg-gline-2" />
          <AccountMenu name={userName} email={userEmail} role={role} />
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto px-3 py-4 md:block">
          <SideNav items={items} />
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 px-6 py-8 lg:px-10">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
