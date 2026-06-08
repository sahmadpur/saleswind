import Link from "next/link";
import { cn } from "@/lib/cn";

type Segment = { label: string; href: string; icon?: string; active: boolean };

/** Material segmented buttons — a single outlined pill split into options. */
export function Segmented({ segments }: { segments: Segment[] }) {
  return (
    <div className="inline-flex rounded-full border border-gline p-0.5">
      {segments.map((s) => (
        <Link
          key={s.href}
          href={s.href}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors",
            "[&_.material-symbols-outlined]:text-[18px]",
            s.active
              ? "bg-gblue-100 text-gblue-dark"
              : "text-ggrey hover:bg-ghover hover:text-gink",
          )}
        >
          {s.icon && <span className="material-symbols-outlined">{s.icon}</span>}
          {s.label}
        </Link>
      ))}
    </div>
  );
}
