import Link from "next/link";
import { cn } from "@/lib/cn";
import { DEFAULT_DIR, type SortDir, type SortKey } from "@/lib/opportunity-sort";

export function SortableTH({ label, sortKey, sort, dir, pathname, extraQuery, align, className }: {
  label: string;
  sortKey: SortKey;
  sort: SortKey;
  dir: SortDir;
  pathname: string;
  extraQuery?: Record<string, string>;
  align?: "right";
  className?: string;
}) {
  const active = sort === sortKey;
  const nextDir = active ? (dir === "asc" ? "desc" : "asc") : DEFAULT_DIR[sortKey];
  return (
    <th className={cn(className, align === "right" && "text-right")}>
      <Link
        href={{ pathname, query: { ...extraQuery, sort: sortKey, dir: nextDir } }}
        className={cn("inline-flex items-center gap-0.5 align-middle transition-colors hover:text-gink", active && "text-gink")}
      >
        {label}
        {active && (
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            {dir === "asc" ? "arrow_upward" : "arrow_downward"}
          </span>
        )}
      </Link>
    </th>
  );
}
