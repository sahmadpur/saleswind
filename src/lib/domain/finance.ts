/**
 * Potential gross profit as a currency amount.
 * Preconditions: `revenue` is a non-negative amount with at most 2 decimals and
 * `marginPct` is 0–100 (both enforced upstream by Zod + the Decimal(_, 2) columns).
 * Returns revenue × marginPct%, rounded to 2 decimals.
 */
export function grossProfit(revenue: number, marginPct: number): number {
  return Math.round(revenue * (marginPct / 100) * 100) / 100;
}
