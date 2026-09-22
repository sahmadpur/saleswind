import { requireRole } from "@/lib/session";
import { dashboardFilterOptions, dashboardRows } from "@/services/dashboard-service";
import {
  MONTHLY_STATUS_LABELS, byAccountable, byStage, currentMonth, inMonth, isOpen,
  monthlyByStatus, totals, type DashboardRow,
} from "@/lib/domain/dashboard";
import { STAGE_META, statusHex } from "@/lib/domain/stages";
import { CategoryBarChart, compactMoney, type BarPoint } from "@/components/dashboard/BarChart";
import { TableFilterBar } from "@/components/ui/TableFilterBar";
import { Card, CardLabel } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { StatStrip } from "@/components/ui/StatStrip";
import { Icon } from "@/components/ui/Icon";
import { money } from "@/lib/format";
import { param, parseMultiFilters, type QueryParams } from "@/lib/table";

const FILTER_KEYS = ["accountable", "status"] as const;
const MODES = [
  { key: "current", label: "Current", icon: "insights" },
  { key: "accountable", label: "By accountable", icon: "group" },
  { key: "monthly", label: "By month", icon: "calendar_month" },
] as const;
type Mode = (typeof MODES)[number]["key"];

const EXPORT_LINK =
  "g-press inline-flex h-9 items-center gap-1.5 rounded-md border border-gline bg-gsurface px-4 text-sm font-medium text-gink transition-colors hover:bg-ghover [&_.material-symbols-outlined]:text-[18px]";

/** How many months back the monthly report reaches. */
const MONTHS_BACK = 12;
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (m: string) => `${MONTH_NAMES[+m.slice(5, 7) - 1]} ${m.slice(2, 4)}`;

const stagePoints = (rows: DashboardRow[], measure: "count" | "gp"): BarPoint[] =>
  byStage(rows).map((s) => ({
    key: s.stage,
    label: s.label,
    value: measure === "count" ? s.count : s.gp,
    display: measure === "count" ? `${s.count} opportunit${s.count === 1 ? "y" : "ies"}` : money(s.gp),
    color: STAGE_META[s.stage].hex,
  }));

/** The two side-by-side charts that make up one "current opportunities" report. */
function CurrentPair({ rows, title, subtitle }: { rows: DashboardRow[]; title: string; subtitle?: string }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <CardLabel>{title}</CardLabel>
        {subtitle && <span className="text-xs text-ggrey">{subtitle}</span>}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <figure className="space-y-2">
          <figcaption className="text-xs font-medium text-ggrey">Opportunities by stage</figcaption>
          <CategoryBarChart data={stagePoints(rows, "count")} empty="No open opportunities" />
        </figure>
        <figure className="space-y-2">
          <figcaption className="text-xs font-medium text-ggrey">Gross profit by stage</figcaption>
          <CategoryBarChart data={stagePoints(rows, "gp")} tickFormat={compactMoney} empty="No gross profit to show" />
        </figure>
      </div>
    </Card>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<QueryParams> }) {
  await requireRole("dashboard:view");
  const params = await searchParams;
  const filters = parseMultiFilters(params, FILTER_KEYS);
  const mode = (MODES.find((m) => m.key === param(params, "mode"))?.key ?? "current") as Mode;
  const month = /^\d{4}-\d{2}$/.test(param(params, "month") ?? "") ? param(params, "month")! : currentMonth();

  const [rows, options] = await Promise.all([dashboardRows(filters), dashboardFilterOptions()]);

  // "Current opportunities" means open work touched in the selected month.
  const open = rows.filter(isOpen);
  const current = inMonth(open, month);
  const stats = totals(current);

  const query = new URLSearchParams();
  for (const k of FILTER_KEYS) for (const v of filters[k]) query.append(k, v);
  query.set("month", month);
  const modeHref = (m: Mode) => {
    const qs = new URLSearchParams(query);
    qs.set("mode", m);
    return `/dashboard?${qs}`;
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        actions={
          <>
            <a href="/dashboard/export?format=xlsx" className={EXPORT_LINK}>
              <Icon name="table_view" />
              Excel
            </a>
            <a href="/dashboard/export?format=pdf" className={EXPORT_LINK}>
              <Icon name="picture_as_pdf" />
              PDF
            </a>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <TableFilterBar
          pathname="/dashboard"
          filters={filters}
          defs={[
            { key: "accountable", label: "Accountable", allLabel: "All accountables", options: options.accountable.map((v) => ({ value: v, label: v })) },
            { key: "status", label: "Status", allLabel: "All statuses", options: options.status.map((v) => ({ value: v, label: v })) },
          ]}
          month={{ value: month, label: "Month" }}
          keep={{ mode }}
        />
        <Segmented segments={MODES.map((m) => ({ label: m.label, icon: m.icon, href: modeHref(m.key), active: mode === m.key }))} />
      </div>

      <StatStrip
        stats={[
          { label: "Predicted revenue", value: money(stats.revenue), icon: "payments", tint: "text-gblue" },
          { label: "Predicted gross profit", value: money(stats.gp), icon: "savings", tint: "text-ggreen" },
          { label: "Current opportunities", value: String(stats.count), icon: "tactic", tint: "text-gyellow-dark" },
        ]}
      />

      {mode === "current" && (
        <CurrentPair
          rows={current}
          title="Current opportunities"
          subtitle="In progress, pending or not started · last changed in the selected month"
        />
      )}

      {mode === "accountable" && (
        <div className="space-y-5">
          {byAccountable(current).length === 0 && (
            <Card className="py-12 text-center text-sm text-ggrey">No current opportunities for these filters.</Card>
          )}
          {byAccountable(current).map((a) => (
            <CurrentPair
              key={a.name}
              rows={current.filter((r) => r.accountable === a.name)}
              title={a.name}
              subtitle={`${a.count} open · ${money(a.gp)} gross profit`}
            />
          ))}
        </div>
      )}

      {mode === "monthly" && (
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <CardLabel>Opportunities per month</CardLabel>
            <span className="text-xs text-ggrey">By the month the status last changed · last {MONTHS_BACK} months</span>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {MONTHLY_STATUS_LABELS.map((label) => (
              <figure key={label} className="space-y-2">
                <figcaption className="flex items-center gap-1.5 text-xs font-medium text-ggrey">
                  <span className="h-2 w-2 rounded-full" style={{ background: statusHex(label) }} />
                  {label}
                </figcaption>
                <CategoryBarChart
                  height={220}
                  empty={`No ${label.toLowerCase()} opportunities`}
                  data={monthlyByStatus(rows, label, MONTHS_BACK).map((m) => ({
                    key: m.month,
                    label: monthLabel(m.month),
                    value: m.count,
                    display: `${m.count} opportunit${m.count === 1 ? "y" : "ies"}`,
                    color: statusHex(label),
                  }))}
                />
              </figure>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
