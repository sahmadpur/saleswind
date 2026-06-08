import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/nav/AppShell";
import { NotificationBell } from "@/components/nav/NotificationBell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <AppShell
      role={user.role}
      userName={user.name ?? user.email ?? "Account"}
      userEmail={user.email ?? ""}
      bell={<NotificationBell />}
    >
      {children}
    </AppShell>
  );
}
