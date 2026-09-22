import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { requireRole } from "@/lib/session";
import { opportunitiesForExport, pipelineSummary } from "@/services/dashboard-service";
import { opportunitiesXlsx } from "@/lib/export/opportunities";

export async function GET(req: Request) {
  await requireRole("dashboard:view");
  const format = new URL(req.url).searchParams.get("format") ?? "xlsx";
  const opps = await opportunitiesForExport();

  if (format === "xlsx") {
    const buf = await opportunitiesXlsx(opps);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="opportunities.xlsx"',
      },
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
  page.drawText("Stage        Count     Pred. Revenue  Pred. Gross Profit", { x: 50, y, size: 12, font: bold });
  y -= 24;
  for (const s of summary) {
    page.drawText(`${s.stage.padEnd(12)} ${String(s.count).padEnd(8)} ${s.revenue.toFixed(2).padEnd(14)} ${s.grossProfit.toFixed(2)}`, { x: 50, y, size: 11, font });
    y -= 20;
  }
  const bytes = await pdf.save();
  return new NextResponse(new Uint8Array(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="pipeline-report.pdf"' },
  });
}
