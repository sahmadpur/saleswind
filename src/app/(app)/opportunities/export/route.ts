import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { listOpportunities } from "@/services/opportunity-service";
import { filterOpportunities, parseFilters, parseSort, sortOpportunities, SELECT_FILTER_KEYS, selected } from "@/lib/opportunity-sort";
import { param, queryParams } from "@/lib/table";
import { opportunitiesPdf, opportunitiesXlsx } from "@/lib/export/opportunities";
import { shortDate } from "@/lib/format";

/** Exports the opportunities table as currently filtered and sorted — every page, not just the visible one. */
export async function GET(req: Request) {
  await requireUser();
  // Multiselect filters repeat their key, so keep every value rather than collapsing to the first.
  const params = queryParams(new URL(req.url).searchParams);
  const { sort, dir } = parseSort(param(params, "sort"), param(params, "dir"));
  const filters = parseFilters(params);
  const rows = sortOpportunities(filterOpportunities(await listOpportunities(), filters), sort, dir);
  const stamp = new Date().toISOString().slice(0, 10);

  if (param(params, "format") === "pdf") {
    const applied = [
      ...SELECT_FILTER_KEYS.filter((k) => selected(filters, k).length > 0).map((k) => `${k}: ${selected(filters, k).join(", ")}`),
      ...(filters.q ? [`search: ${filters.q}`] : []),
    ].join(" · ");
    const subtitle = `Generated ${shortDate(new Date())} · ${rows.length} opportunities${applied ? ` · ${applied}` : ""}`;
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
