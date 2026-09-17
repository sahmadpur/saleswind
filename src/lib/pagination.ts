export const PAGE_SIZES = [25, 50, 100] as const;

/** Page and page size from the query string, clamped to valid values. */
export function parsePage(q: { page?: string; size?: string }, sizes: readonly number[] = PAGE_SIZES): { page: number; size: number } {
  const size = sizes.includes(Number(q.size)) ? Number(q.size) : sizes[0];
  const page = Math.max(1, Math.floor(Number(q.page)) || 1);
  return { page, size };
}

/** Rows for one page; an out-of-range page falls back to the last page. */
export function paginate<T>(rows: T[], page: number, size: number): { rows: T[]; page: number; pageCount: number } {
  const pageCount = Math.max(1, Math.ceil(rows.length / size));
  const p = Math.min(page, pageCount);
  return { rows: rows.slice((p - 1) * size, p * size), page: p, pageCount };
}

/** Page numbers to show, with null marking a gap: [1, null, 4, 5, 6, null, 12]. */
export function pageWindow(page: number, pageCount: number): (number | null)[] {
  const keep = new Set([1, pageCount, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pageCount));
  const sorted = [...keep].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push(n - sorted[i - 1] === 2 ? n - 1 : null);
    out.push(n);
  });
  return out;
}
