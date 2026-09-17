"use client";
import { useEffect } from "react";
import { cn } from "@/lib/cn";

const SIZES = { md: "max-w-md", lg: "max-w-2xl" } as const;

export function Dialog({
  open,
  onClose,
  title,
  size = "md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: keyof typeof SIZES;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gink/50 p-4"
      style={{ animation: "g-fade 0.15s ease both" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn("g-pop max-h-[90vh] w-full overflow-y-auto rounded-lg bg-gsurface p-6 shadow-g3", SIZES[size])}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-gink">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 place-items-center rounded-full text-ggrey transition-colors hover:bg-ghover hover:text-gink"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
