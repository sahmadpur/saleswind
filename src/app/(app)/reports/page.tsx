import { requireRole } from "@/lib/session";
import { pipelineSummary } from "@/services/report-service";
import { Card, CardLabel } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Icon } from "@/components/ui/Icon";
import { money } from "@/lib/format";

const META: Record<string, { label: string; bar: string; dot: string }> = {
  PROSPECT: { label: "Prospect", bar: "bg-gyellow", dot: "bg-gyellow" },
  SALES: { label: "Sales", bar: "bg-gblue", dot: "bg-gblue" },
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
    <div className="space-y-8">
      <PageHeader
        title="Reports"
        subtitle="Pipeline performance at a glance"
        actions={
          <>
            <a
              href="/reports/export?format=csv"
              className="g-press inline-flex h-9 items-center gap-2 rounded-full border border-gline px-5 text-sm font-medium text-gblue transition-colors hover:bg-gblue-50 [&_.material-symbols-outlined]:text-[18px]"
            >
              <Icon name="table_view" />
              CSV
            </a>
            <a
              href="/reports/export?format=pdf"
              className="g-press inline-flex h-9 items-center gap-2 rounded-full border border-gline px-5 text-sm font-medium text-gblue transition-colors hover:bg-gblue-50 [&_.material-symbols-outlined]:text-[18px]"
            >
              <Icon name="picture_as_pdf" />
              PDF
            </a>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Pipeline revenue", value: money(totalRevenue), icon: "payments", tint: "text-gblue", bg: "bg-gblue-100" },
          { label: "Gross profit", value: money(totalGP), icon: "savings", tint: "text-ggreen", bg: "bg-ggreen-50" },
          { label: "Active deals", value: String(totalCount), icon: "tactic", tint: "text-[#a36200]", bg: "bg-gyellow-50" },
        ].map((s) => (
          <Card key={s.label} className="g-rise flex items-center gap-4 p-5">
            <span className={`grid h-11 w-11 place-items-center rounded-full ${s.bg} ${s.tint}`}>
              <Icon name={s.icon} filled />
            </span>
            <div className="min-w-0">
              <div className="truncate text-2xl font-normal text-gink">{s.value}</div>
              <div className="text-xs text-ggrey">{s.label}</div>
            </div>
          </Card>
        ))}
      </div>

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
                <div className="h-7 flex-1 overflow-hidden rounded-lg bg-ghover">
                  <div
                    className={`flex h-7 items-center justify-end rounded-lg ${m.bar} pr-2 transition-[width] duration-500`}
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
