import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { requireRole } from "@/lib/session";
import { opportunitiesForExport, pipelineSummary } from "@/services/report-service";
import { grossProfit } from "@/lib/domain/finance";
import { opportunityRef } from "@/lib/format";
import { toCsv } from "@/lib/csv";

export async function GET(req: Request) {
  await requireRole("reports:view");
  const format = new URL(req.url).searchParams.get("format") ?? "csv";
  const opps = await opportunitiesForExport();

  if (format === "csv") {
    const headers = ["ID", "Title", "Account", "State", "Status", "Accountable", "Predicted Revenue", "Margin %", "Predicted Gross Profit", "Cancelled"];
    const rows = opps.map((o) => [
      opportunityRef(o.number), o.title, o.account.name, o.state, o.status?.label ?? "", o.accountable.name,
      Number(o.revenue), Number(o.marginPct), grossProfit(Number(o.revenue), Number(o.marginPct)), o.isCancelled ? "Yes" : "No",
    ]);
    return new NextResponse(toCsv(headers, rows), {
      headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="opportunities.csv"' },
    });
  }

  // PDF: pipeline summary
  const summary = await pipelineSummary();
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawText("Saleswind - Pipeline Report", { x: 50, y: 790, size: 18, font: bold });
  let y = 740;
  page.drawText("State        Count     Pred. Revenue  Pred. Gross Profit", { x: 50, y, size: 12, font: bold });
  y -= 24;
  for (const s of summary) {
    page.drawText(`${s.state.padEnd(12)} ${String(s.count).padEnd(8)} ${s.revenue.toFixed(2).padEnd(14)} ${s.grossProfit.toFixed(2)}`, { x: 50, y, size: 11, font });
    y -= 20;
  }
  const bytes = await pdf.save();
  return new NextResponse(new Uint8Array(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="pipeline-report.pdf"' },
  });
}
