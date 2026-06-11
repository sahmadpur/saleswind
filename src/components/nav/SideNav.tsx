"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { signOutAction } from "@/actions/auth-actions";

type Item = { href: string; label: string; icon: string };
export type NavGroup = { label: string; items: Item[] };

const ITEM =
  "group flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-150";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-1.5 pt-4 text-[11px] font-medium uppercase tracking-[0.08em] text-ggrey-2">
      {children}
    </div>
  );
}

function NavLink({ item }: { item: Item }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(item.href + "/");
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        ITEM,
        active
          ? "bg-gblue-100 font-medium text-gblue-dark"
          : "font-normal text-gink-2 hover:bg-ghover",
      )}
    >
      <span className={cn("material-symbols-outlined", active && "fill")} style={{ fontSize: 20 }}>
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}

export function SideNav({ groups }: { groups: NavGroup[] }) {
  return (
    <nav className="flex h-full min-h-0 flex-col">
      {groups.map((g) => (
        <div key={g.label}>
          <SectionLabel>{g.label}</SectionLabel>
          <div className="flex flex-col gap-0.5">
            {g.items.map((i) => <NavLink key={i.href} item={i} />)}
          </div>
        </div>
      ))}

      <div className="mt-auto border-t border-gline-2 pb-1">
        <SectionLabel>Account</SectionLabel>
        <div className="flex flex-col gap-0.5">
          <NavLink item={{ href: "/settings", label: "Settings", icon: "settings" }} />
          <form action={signOutAction}>
            <button type="submit" className={cn(ITEM, "font-normal text-gink-2 hover:bg-ghover")}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
              Log out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
