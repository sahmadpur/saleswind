"use client";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type BarPoint = {
  key: string;
  label: string;
  value: number;
  /** Pre-formatted value for the tooltip — money() is server-only. */
  display: string;
  color: string;
};

/** Axis ticks render on the client, so they can't use the server-only money(). */
const compact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
export const compactMoney = (n: number) => compact.format(n);

const INK = "#5b6478";      // --color-ggrey
const HAIRLINE = "#e9ecf1"; // --color-gline-2

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: BarPoint }[] }) {
  const point = active ? payload?.[0]?.payload : null;
  if (!point) return null;
  return (
    <div className="rounded-md border border-gline bg-gsurface px-3 py-2 text-xs shadow-g2">
      <p className="flex items-center gap-1.5 font-medium text-gink">
        <span className="h-2 w-2 rounded-full" style={{ background: point.color }} />
        {point.label}
      </p>
      <p className="mt-0.5 tabular-nums text-gink-2">{point.display}</p>
    </div>
  );
}

/**
 * One measure across a handful of categories. Single series per chart — the card's
 * heading names it, so no legend — with each bar coloured by the entity it stands for.
 */
export function CategoryBarChart({ data, tickFormat, height = 240, empty = "Nothing to show" }: {
  data: BarPoint[];
  /** Axis tick labels; the tooltip uses each point's pre-formatted `display`. */
  tickFormat?: (v: number) => string;
  height?: number;
  empty?: string;
}) {
  if (data.every((d) => d.value === 0)) {
    return <p className="grid place-items-center text-sm text-ggrey" style={{ height }}>{empty}</p>;
  }
  // Four stages always fit; a year of months does not, so thin dense axes down to about four labels.
  const interval = data.length > 6 ? Math.ceil(data.length / 4) - 1 : 0;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke={HAIRLINE} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={{ stroke: HAIRLINE }}
          tick={{ fill: INK, fontSize: 12 }}
          interval={interval}
          minTickGap={4}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={52}
          tick={{ fill: INK, fontSize: 11 }}
          tickFormatter={tickFormat ?? ((v: number) => String(v))}
          allowDecimals={false}
        />
        <Tooltip cursor={{ fill: "#eef1f5" }} content={<ChartTooltip />} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={56} isAnimationActive={false}>
          {data.map((d) => <Cell key={d.key} fill={d.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
