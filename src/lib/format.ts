/** Human-friendly reference code from an auto-incrementing number, e.g. ref("OPP", 7) → "OPP-0007". */
export function ref(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(4, "0")}`;
}
export const accountRef = (n: number) => ref("ACC", n);
export const opportunityRef = (n: number) => ref("OPP", n);

export function money(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

// Dates render in one fixed zone so server output is stable regardless of host TZ.
// Server-side only: client components receive pre-formatted strings.
const timeZone = () => process.env.APP_TIMEZONE || "Asia/Baku";

function parts(d: Date, withTime: boolean): Record<string, string> {
  const fmt = new Intl.DateTimeFormat("en-US", {
    day: "numeric", month: "short", year: "numeric", timeZone: timeZone(),
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" } : {}),
  } as Intl.DateTimeFormatOptions);
  return Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]));
}

/** Exact date, e.g. "17 Sep 2026". */
export function shortDate(d: Date): string {
  const p = parts(d, false);
  return `${p.day} ${p.month} ${p.year}`;
}

/** Exact timestamp, e.g. "17 Sep 2026, 14:05". */
export function dateTime(d: Date): string {
  const p = parts(d, true);
  return `${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute}`;
}

/** A date-only value (stored as UTC midnight), e.g. a due date → "17 Sep 2026". */
export function dateOnly(d: Date): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).formatToParts(d).map((x) => [x.type, x.value]),
  );
  return `${p.day} ${p.month} ${p.year}`;
}

/** Today's date as "YYYY-MM-DD" in the app time zone. */
export function todayIso(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timeZone() }).format(now);
}

/** "Ruslan Sultanov" → "Ruslan S."; single names are returned unchanged. */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}
