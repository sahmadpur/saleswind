import { requireRole } from "@/lib/session";
import { pipelineSummary } from "@/services/report-service";
import { Card } from "@/components/ui/Card";
import { money } from "@/lib/format";

const LABEL: Record<string, string> = { PROSPECT: "Prospect", SALES: "Sales", CONTRACT: "Contract", PROJECT: "Project" };

export default async function ReportsPage() {
  await requireRole("reports:view");
  const summary = await pipelineSummary();
  const totalRevenue = summary.reduce((s, x) => s + x.revenue, 0);
  const totalGP = summary.reduce((s, x) => s + x.grossProfit, 0);
  const maxRevenue = Math.max(1, ...summary.map((s) => s.revenue));
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium">Reports</h1>
        <div className="flex gap-2">
          <a href="/reports/export?format=csv" className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100">Export CSV</a>
          <a href="/reports/export?format=pdf" className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100">Export PDF</a>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card><div className="text-sm text-neutral-500">Total pipeline revenue</div><div className="mt-1 text-2xl font-medium">{money(totalRevenue)}</div></Card>
        <Card><div className="text-sm text-neutral-500">Total gross profit</div><div className="mt-1 text-2xl font-medium">{money(totalGP)}</div></Card>
      </div>
      <Card>
        <h2 className="mb-4 text-sm font-medium text-neutral-500">Pipeline by state</h2>
        <div className="space-y-3">
          {summary.map((s) => (
            <div key={s.state} className="flex items-center gap-4">
              <div className="w-24 text-sm">{LABEL[s.state]}</div>
              <div className="h-6 flex-1 rounded bg-neutral-100">
                <div className="h-6 rounded bg-blue-500" style={{ width: `${(s.revenue / maxRevenue) * 100}%` }} />
              </div>
              <div className="w-40 text-right text-sm text-neutral-600">{s.count} · {money(s.revenue)}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
