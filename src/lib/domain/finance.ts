export function grossProfit(revenue: number, marginPct: number): number {
  return Math.round(revenue * (marginPct / 100) * 100) / 100;
}
