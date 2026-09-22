import Link from "next/link";
import { cn } from "@/lib/cn";
import type { SortDir } from "@/lib/table";

/**
 * Column header that sorts by linking, so sorting needs no client JS.
 * `data-col` is what ties the column to its saved width in ColResizer.
 */
export function SortableTH<K extends string>({ label, sortKey, sort, dir, defaultDir, pathname, extraQuery, align, className, children }: {
  label: string;
  sortKey: K;
  sort: K;
  dir: SortDir;
  defaultDir: Record<K, SortDir>;
  pathname: string;
  /** Filters and view state to carry across; repeated keys are preserved. */
  extraQuery?: URLSearchParams | Record<string, string>;
  align?: "right";
  className?: string;
  children?: React.ReactNode;
}) {
  const active = sort === sortKey;
  const nextDir = active ? (dir === "asc" ? "desc" : "asc") : defaultDir[sortKey];
  const qs = new URLSearchParams(extraQuery);
  qs.set("sort", sortKey);
  qs.set("dir", nextDir);
  return (
    <th data-col={label} className={cn(className, align === "right" && "text-right")}>
      <Link
        href={`${pathname}?${qs}`}
        className={cn("inline-flex items-center gap-0.5 align-middle transition-colors hover:text-gink", active && "text-gink")}
      >
        {label}
        {active && (
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            {dir === "asc" ? "arrow_upward" : "arrow_downward"}
          </span>
        )}
      </Link>
      {children}
    </th>
  );
}
