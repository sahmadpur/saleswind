import type { Role } from "@prisma/client";
import { can, type Action } from "@/lib/domain/permissions";
import { ShellLayout } from "@/components/nav/ShellLayout";
import { AccountMenu } from "@/components/nav/AccountMenu";

type NavItem = { href: string; label: string; icon: string; action: Action | null };

const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: "Pipeline",
    items: [
      { href: "/opportunities", label: "Opportunities", icon: "monitoring", action: null },
      { href: "/accounts", label: "Accounts", icon: "domain", action: null },
      { href: "/tasks", label: "Tasks", icon: "task_alt", action: null },
      { href: "/reports", label: "Reports", icon: "bar_chart", action: "reports:view" },
    ],
  },
  {
    label: "Directory",
    items: [
      { href: "/vendors", label: "Vendors", icon: "local_shipping", action: null },
      { href: "/staff", label: "Staff", icon: "badge", action: null },
      { href: "/partners", label: "Partners", icon: "handshake", action: null },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/dictionary", label: "Dictionary", icon: "menu_book", action: null },
      { href: "/instructions", label: "Instructions", icon: "help", action: null },
      { href: "/users", label: "Users", icon: "group", action: "users:manage" },
      { href: "/audit", label: "Audit log", icon: "policy", action: "audit:view" },
    ],
  },
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
  const groups = NAV.map((g) => ({
    label: g.label,
    items: g.items
      .filter((i) => !i.action || can(role, i.action))
      .map(({ href, label, icon }) => ({ href, label, icon })),
  })).filter((g) => g.items.length > 0);

  return (
    <ShellLayout
      groups={groups}
      bell={bell}
      accountMenu={<AccountMenu name={userName} email={userEmail} role={role} />}
    >
      {children}
    </ShellLayout>
  );
}
