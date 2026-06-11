/** Human-friendly reference code from an auto-incrementing number, e.g. ref("OPP", 7) → "OPP-0007". */
export function ref(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(4, "0")}`;
}
export const accountRef = (n: number) => ref("ACC", n);
export const opportunityRef = (n: number) => ref("OPP", n);

export function money(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export function shortDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "2-digit" }).format(d);
}

export function monthLabel(d: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(d);
}

export function relativeTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}
