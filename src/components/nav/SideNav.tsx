"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

type Item = { href: string; label: string; icon: string };

export function SideNav({ items }: { items: Item[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {items.map((i) => {
        const active = pathname === i.href || pathname.startsWith(i.href + "/");
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex h-10 items-center gap-4 rounded-full pl-4 pr-5 text-sm transition-colors duration-150",
              active
                ? "bg-gblue-100 font-medium text-gblue-dark"
                : "font-normal text-gink-2 hover:bg-ghover",
            )}
          >
            <span
              className={cn("material-symbols-outlined", active && "fill")}
              style={{ fontSize: 22 }}
            >
              {i.icon}
            </span>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
