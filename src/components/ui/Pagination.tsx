import Link from "next/link";
import { cn } from "@/lib/cn";
import { pageWindow } from "@/lib/pagination";

const BTN = "grid h-8 min-w-8 place-items-center rounded-md px-2 text-[13px] tabular-nums transition-colors";

/** Footer pager for URL-driven tables: range summary, page links and optional page-size links. */
export function Pagination({ pathname, query, page, size, total, sizes }: {
  pathname: string;
  query: Record<string, string>;
  page: number;
  size: number;
  total: number;
  sizes?: readonly number[];
}) {
  const pageCount = Math.max(1, Math.ceil(total / size));
  const href = (p: number, s = size) => ({ pathname, query: { ...query, page: String(p), size: String(s) } });
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(page * size, total);

  const arrow = (p: number, icon: string, label: string, disabled: boolean) =>
    disabled ? (
      <span className={cn(BTN, "text-ggrey-2/60")} aria-hidden>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{icon}</span>
      </span>
    ) : (
      <Link href={href(p)} aria-label={label} className={cn(BTN, "text-ggrey hover:bg-ghover hover:text-gink")}>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{icon}</span>
      </Link>
    );

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-gline-2 bg-gbg px-4 py-2 text-xs text-ggrey">
      <span className="tabular-nums">{from}–{to} of {total}</span>
      <div className="flex items-center gap-0.5">
        {arrow(page - 1, "chevron_left", "Previous page", page <= 1)}
        {pageWindow(page, pageCount).map((n, i) =>
          n === null ? (
            <span key={`gap${i}`} className={cn(BTN, "text-ggrey-2")}>…</span>
          ) : (
            <Link
              key={n}
              href={href(n)}
              aria-current={n === page ? "page" : undefined}
              className={cn(BTN, n === page ? "bg-gink font-medium text-white" : "text-ggrey hover:bg-ghover hover:text-gink")}
            >
              {n}
            </Link>
          ),
        )}
        {arrow(page + 1, "chevron_right", "Next page", page >= pageCount)}
      </div>
      {sizes ? (
        <div className="flex items-center gap-1">
          <span className="mr-1">Rows</span>
          {sizes.map((s) => (
            <Link
              key={s}
              href={href(1, s)}
              aria-current={s === size ? "true" : undefined}
              className={cn(BTN, s === size ? "bg-gsurface font-medium text-gink ring-1 ring-gline" : "text-ggrey hover:bg-ghover hover:text-gink")}
            >
              {s}
            </Link>
          ))}
        </div>
      ) : <span />}
    </nav>
  );
}
