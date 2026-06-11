import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";

export type Stat = { label: string; value: string; icon: string; tint: string };

/** Slim horizontal stat summary — compact replacement for full-size stat cards. */
export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <Card className="flex flex-wrap items-center gap-y-2 divide-x divide-gline-2 px-2 py-2.5">
      {stats.map((s) => (
        <div key={s.label} className="flex min-w-0 items-center gap-2 px-4">
          <Icon name={s.icon} filled className={s.tint} style={{ fontSize: 18 }} />
          <span className="text-base font-medium tabular-nums text-gink">{s.value}</span>
          <span className="text-xs text-ggrey">{s.label}</span>
        </div>
      ))}
    </Card>
  );
}
