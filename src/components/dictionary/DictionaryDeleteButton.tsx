"use client";
import { useTransition } from "react";
import { cn } from "@/lib/cn";

/** Small × that confirms, then deletes a dictionary entry; failures (e.g. status in use) are shown in an alert. */
export function DictionaryDeleteButton({ action, label, confirmText, className }: {
  action: () => Promise<{ error?: string }>; label: string; confirmText: string; className?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      title={`Delete ${label}`}
      aria-label={`Delete ${label}`}
      disabled={pending}
      onClick={() => {
        if (!confirm(confirmText)) return;
        start(async () => {
          const res = await action();
          if (res.error) alert(res.error);
        });
      }}
      className={cn("grid h-7 w-6 place-items-center text-current opacity-50 transition-opacity hover:opacity-100 disabled:opacity-30", className)}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
    </button>
  );
}
