"use client";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { signOutAction } from "@/actions/auth-actions";

export function AccountMenu({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-ghover g-focus"
        aria-label="Account"
      >
        <Avatar name={name} size={32} />
      </button>
      {open && (
        <div className="g-pop absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-3xl border border-gline-2 bg-gsurface shadow-g3">
          <div className="flex flex-col items-center gap-2 px-6 pb-4 pt-6 text-center">
            <Avatar name={name} size={56} />
            <div>
              <div className="text-sm font-medium text-gink">{name}</div>
              <div className="text-xs text-ggrey">{email}</div>
            </div>
            <span className="mt-1 rounded-full bg-ghover px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-ggrey">
              {role}
            </span>
          </div>
          <div className="border-t border-gline-2 p-2">
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-gink-2 transition-colors hover:bg-ghover"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
