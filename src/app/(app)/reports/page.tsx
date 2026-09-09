import { requireRole } from "@/lib/session";
import { pipelineSummary } from "@/services/report-service";
import { Card, CardLabel } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatStrip } from "@/components/ui/StatStrip";
import { Icon } from "@/components/ui/Icon";
import { money } from "@/lib/format";

const META: Record<string, { label: string; bar: string; dot: string }> = {
  PROSPECT: { label: "Prospect", bar: "bg-gyellow", dot: "bg-gyellow" },
  SALES: { label: "Sales", bar: "bg-gsales", dot: "bg-gsales" },
  CONTRACT: { label: "Contract", bar: "bg-gviolet", dot: "bg-gviolet" },
  PROJECT: { label: "Project", bar: "bg-ggreen", dot: "bg-ggreen" },
};

export default async function ReportsPage() {
  await requireRole("reports:view");
  const summary = await pipelineSummary();
  const totalRevenue = summary.reduce((s, x) => s + x.revenue, 0);
  const totalGP = summary.reduce((s, x) => s + x.grossProfit, 0);
  const totalCount = summary.reduce((s, x) => s + x.count, 0);
  const maxRevenue = Math.max(1, ...summary.map((s) => s.revenue));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        actions={
          <>
            <a
              href="/reports/export?format=csv"
              className="g-press inline-flex h-9 items-center gap-1.5 rounded-md border border-gline bg-gsurface px-4 text-sm font-medium text-gink transition-colors hover:bg-ghover [&_.material-symbols-outlined]:text-[18px]"
            >
              <Icon name="table_view" />
              CSV
            </a>
            <a
              href="/reports/export?format=pdf"
              className="g-press inline-flex h-9 items-center gap-1.5 rounded-md border border-gline bg-gsurface px-4 text-sm font-medium text-gink transition-colors hover:bg-ghover [&_.material-symbols-outlined]:text-[18px]"
            >
              <Icon name="picture_as_pdf" />
              PDF
            </a>
          </>
        }
      />

      <StatStrip
        stats={[
          { label: "Predicted revenue", value: money(totalRevenue), icon: "payments", tint: "text-gblue" },
          { label: "Predicted gross profit", value: money(totalGP), icon: "savings", tint: "text-ggreen" },
          { label: "Active deals", value: String(totalCount), icon: "tactic", tint: "text-gyellow-dark" },
        ]}
      />

      <Card>
        <CardLabel>Pipeline by state</CardLabel>
        <div className="space-y-5">
          {summary.map((s) => {
            const m = META[s.state] ?? { label: s.state, bar: "bg-ggrey-2", dot: "bg-ggrey-2" };
            return (
              <div key={s.state} className="flex items-center gap-4">
                <div className="flex w-28 items-center gap-2 text-sm text-gink">
                  <span className={`h-2 w-2 rounded-full ${m.dot}`} />
                  {m.label}
                </div>
                <div className="h-6 flex-1 overflow-hidden rounded-sm bg-ghover">
                  <div
                    className={`flex h-6 items-center justify-end rounded-sm ${m.bar} pr-2`}
                    style={{ width: `${Math.max((s.revenue / maxRevenue) * 100, 4)}%` }}
                  >
                    <span className="text-[11px] font-medium text-white/95">{s.count}</span>
                  </div>
                </div>
                <div className="w-32 text-right text-sm tabular-nums text-gink-2">{money(s.revenue)}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
