import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { listOpportunities } from "@/services/opportunity-service";
import { filterOpportunities, parseFilters, parseSort, sortOpportunities } from "@/lib/opportunity-sort";
import { opportunitiesPdf, opportunitiesXlsx } from "@/lib/export/opportunities";
import { dateTime } from "@/lib/format";

/** Exports the opportunities table as currently filtered and sorted — every page, not just the visible one. */
export async function GET(req: Request) {
  await requireUser();
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const { sort, dir } = parseSort(params.sort, params.dir);
  const filters = parseFilters(params);
  const rows = sortOpportunities(filterOpportunities(await listOpportunities(), filters), sort, dir);
  const stamp = new Date().toISOString().slice(0, 10);

  if (params.format === "pdf") {
    const applied = Object.entries(filters).map(([k, v]) => `${k}: ${v}`).join(" · ");
    const subtitle = `Generated ${dateTime(new Date())} · ${rows.length} opportunities${applied ? ` · ${applied}` : ""}`;
    const bytes = await opportunitiesPdf(rows, subtitle);
    return new NextResponse(new Uint8Array(bytes), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="opportunities-${stamp}.pdf"` },
    });
  }

  const buf = await opportunitiesXlsx(rows);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="opportunities-${stamp}.xlsx"`,
    },
  });
}
