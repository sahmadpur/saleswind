"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { markAllReadAction } from "@/actions/notification-actions";

type Item = { id: string; message: string; read: boolean };

export function NotificationDropdown({ count, items }: { count: number; items: Item[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative text-neutral-600 hover:text-neutral-900">
        🔔
        {count > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">{count}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl bg-white p-2 shadow-lg">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs font-medium text-neutral-500">Notifications</span>
            <button onClick={async () => { await markAllReadAction(); router.refresh(); }} className="text-xs text-blue-600 hover:underline">Mark all read</button>
          </div>
          {items.length === 0 && <p className="px-2 py-3 text-sm text-neutral-400">Nothing yet</p>}
          {items.map((n) => (
            <div key={n.id} className={`rounded-lg px-2 py-2 text-sm ${n.read ? "text-neutral-400" : "text-neutral-800"}`}>{n.message}</div>
          ))}
        </div>
      )}
    </div>
  );
}
