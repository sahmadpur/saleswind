"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { markAllReadAction } from "@/actions/notification-actions";

type Item = { id: string; message: string; read: boolean };

export function NotificationDropdown({ count, items }: { count: number; items: Item[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

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
        className="relative grid h-10 w-10 place-items-center rounded-full text-ggrey transition-colors hover:bg-ghover hover:text-gink g-focus"
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 24 }}>notifications</span>
        {count > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gred px-1 text-[10px] font-medium text-white ring-2 ring-gsurface">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>
      {open && (
        <div className="g-pop absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-3xl border border-gline-2 bg-gsurface shadow-g3">
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-base font-medium text-gink">Notifications</span>
            <button
              onClick={async () => {
                await markAllReadAction();
                router.refresh();
              }}
              className="rounded-full px-2 py-1 text-xs font-medium text-gblue transition-colors hover:bg-gblue-50"
            >
              Mark all read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto border-t border-gline-2 py-1">
            {items.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <span className="material-symbols-outlined text-ggrey-2" style={{ fontSize: 32 }}>
                  done_all
                </span>
                <p className="text-sm text-ggrey">You&apos;re all caught up</p>
              </div>
            )}
            {items.map((n) => (
              <div
                key={n.id}
                className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-ghover"
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-gblue"}`}
                />
                <p className={`text-sm leading-snug ${n.read ? "text-ggrey" : "text-gink"}`}>
                  {n.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
