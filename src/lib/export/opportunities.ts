import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import { grossProfit } from "@/lib/domain/finance";
import { money, opportunityRef, shortDate } from "@/lib/format";

export type ExportRow = {
  number: number; title: string; stage: string; revenue: unknown; marginPct: unknown;
  account: { name: string }; accountable: { name: string }; status: { label: string } | null;
  tags?: { tag: { label: string } }[]; lastModifiedAt: Date;
};

const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

function flatten(o: ExportRow) {
  const revenue = Number(o.revenue), margin = Number(o.marginPct);
  return {
    ref: opportunityRef(o.number), title: o.title, account: o.account.name, stage: titleCase(o.stage),
    status: o.status?.label ?? "", tags: (o.tags ?? []).map((t) => t.tag.label).join(", "),
    revenue, margin, gp: grossProfit(revenue, margin), accountable: o.accountable.name, modified: o.lastModifiedAt,
  };
}

export async function opportunitiesXlsx(rows: ExportRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Saleswind";
  const ws = wb.addWorksheet("Opportunities", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [
    { header: "ID", key: "ref", width: 11 },
    { header: "Title", key: "title", width: 40 },
    { header: "Account", key: "account", width: 24 },
    { header: "Stage", key: "stage", width: 12 },
    { header: "Status", key: "status", width: 16 },
    { header: "Tags", key: "tags", width: 30 },
    { header: "Predicted revenue", key: "revenue", width: 18, style: { numFmt: '"$"#,##0.00' } },
    { header: "Margin %", key: "margin", width: 10, style: { numFmt: '0.00"%"' } },
    { header: "Predicted gross profit", key: "gp", width: 20, style: { numFmt: '"$"#,##0.00' } },
    { header: "Accountable", key: "accountable", width: 20 },
    { header: "Modified", key: "modified", width: 18, style: { numFmt: "dd.mm.yyyy" } },
  ];
  for (const r of rows) ws.addRow(flatten(r));
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF182033" } };
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columns.length } };
  return Buffer.from(await wb.xlsx.writeBuffer());
}

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");

/** Longest prefix of `text` that fits `width`, with an ellipsis when cut. */
function fit(text: string, font: PDFFont, size: number, width: number): string {
  if (font.widthOfTextAtSize(text, size) <= width) return text;
  let lo = 0, hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (font.widthOfTextAtSize(text.slice(0, mid) + "…", size) <= width) lo = mid; else hi = mid - 1;
  }
  return text.slice(0, lo) + "…";
}

export async function opportunitiesPdf(rows: ExportRow[], subtitle: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  // Embedded Plex (not a standard PDF font) so non-Latin-1 names like "Əli" render.
  const [regular, bold] = await Promise.all([
    fs.readFile(path.join(FONT_DIR, "IBMPlexSans-Regular.woff")).then((b) => pdf.embedFont(b, { subset: true })),
    fs.readFile(path.join(FONT_DIR, "IBMPlexSans-SemiBold.woff")).then((b) => pdf.embedFont(b, { subset: true })),
  ]);

  const W = 842, H = 595, M = 32, SIZE = 8, ROW = 16;
  const cols: { label: string; w: number; right?: boolean; get: (r: ReturnType<typeof flatten>) => string }[] = [
    { label: "ID", w: 50, get: (r) => r.ref },
    { label: "Title", w: 152, get: (r) => r.title },
    { label: "Account", w: 105, get: (r) => r.account },
    { label: "Stage", w: 55, get: (r) => r.stage },
    { label: "Status", w: 70, get: (r) => r.status },
    { label: "PR", w: 65, right: true, get: (r) => money(r.revenue) },
    { label: "MR", w: 40, right: true, get: (r) => `${r.margin}%` },
    { label: "PGP", w: 65, right: true, get: (r) => money(r.gp) },
    { label: "Accountable", w: 80, get: (r) => r.accountable },
    { label: "Modified", w: 96, get: (r) => shortDate(r.modified) },
  ];
  const ink = rgb(0.094, 0.125, 0.2), grey = rgb(0.36, 0.39, 0.47), line = rgb(0.91, 0.925, 0.945);
  const data = rows.map(flatten);
  const pageCount = Math.max(1, Math.ceil((data.length) / Math.floor((H - M * 2 - 70) / ROW)));
  let i = 0;

  for (let p = 1; p <= pageCount; p++) {
    const page = pdf.addPage([W, H]);
    let y = H - M;
    if (p === 1) {
      page.drawText("Saleswind — Opportunities", { x: M, y: y - 14, size: 15, font: bold, color: ink });
      page.drawText(subtitle, { x: M, y: y - 30, size: 8.5, font: regular, color: grey });
    }
    y -= 52;
    page.drawRectangle({ x: M, y: y - 5, width: W - M * 2, height: ROW, color: rgb(0.094, 0.125, 0.2) });
    let x = M + 4;
    for (const c of cols) {
      const tw = bold.widthOfTextAtSize(c.label, SIZE);
      page.drawText(c.label, { x: c.right ? x + c.w - 8 - tw : x, y, size: SIZE, font: bold, color: rgb(1, 1, 1) });
      x += c.w;
    }
    y -= ROW;
    while (i < data.length && y > M + 20) {
      x = M + 4;
      for (const c of cols) {
        const text = fit(c.get(data[i]), regular, SIZE, c.w - 8);
        const tw = regular.widthOfTextAtSize(text, SIZE);
        page.drawText(text, { x: c.right ? x + c.w - 8 - tw : x, y, size: SIZE, font: regular, color: ink });
        x += c.w;
      }
      page.drawLine({ start: { x: M, y: y - 5 }, end: { x: W - M, y: y - 5 }, thickness: 0.5, color: line });
      y -= ROW;
      i++;
    }
    page.drawText(`Page ${p} of ${pageCount}`, { x: W - M - 50, y: M - 12, size: 7.5, font: regular, color: grey });
  }
  return pdf.save();
}
