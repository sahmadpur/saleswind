"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { SideNav, type NavGroup } from "@/components/nav/SideNav";

function Brand({ dark = true }: { dark?: boolean }) {
  return (
    <div className="flex h-16 shrink-0 items-center gap-2.5 px-5">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-gblue text-white" aria-hidden>
        <span className="material-symbols-outlined fill" style={{ fontSize: 18 }}>air</span>
      </span>
      <span className={cn("text-[1.0625rem] font-semibold tracking-[-0.01em]", dark ? "text-white" : "text-gink")}>
        Saleswind
      </span>
    </div>
  );
}

export function ShellLayout({ groups, bell, accountMenu, children }: {
  groups: NavGroup[];
  bell: React.ReactNode;
  accountMenu: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Navigating away closes the mobile drawer (state adjusted during render, per React docs).
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    if (mobileOpen) setMobileOpen(false);
  }

  const toggle = () => {
    if (window.matchMedia("(min-width: 768px)").matches) setOpen((v) => !v);
    else setMobileOpen((v) => !v);
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — full height, brand on top, grouped nav, account pinned at the bottom */}
      {open && (
        <aside className="sticky top-0 hidden h-screen w-[15rem] shrink-0 flex-col bg-gink md:flex">
          <Brand />
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            <SideNav groups={groups} />
          </div>
        </aside>
      )}

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden">
          <div className="fixed inset-0 z-30 bg-black/30" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-gink shadow-g3">
            <Brand />
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
              <SideNav groups={groups} />
            </div>
          </aside>
        </div>
      )}

      {/* Content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gline-2 bg-gbg/85 px-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Toggle navigation"
              aria-expanded={open || mobileOpen}
              onClick={toggle}
              className="grid h-9 w-9 place-items-center rounded-md text-ggrey transition-colors hover:bg-ghover hover:text-gink g-focus"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>menu</span>
            </button>
            {/* Brand lives in the sidebar; resurface it here when the sidebar is hidden */}
            <div className={cn("-ml-5", open && "md:hidden")}>
              <Brand dark={false} />
            </div>
          </div>
          <div className="flex items-center gap-1">
            {bell}
            <span className="mx-1 h-6 w-px bg-gline-2" />
            {accountMenu}
          </div>
        </header>

        <main className="min-w-0 flex-1 px-5 py-7 lg:px-8">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
