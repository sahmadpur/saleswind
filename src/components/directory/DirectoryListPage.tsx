import Link from "next/link";
import type { DirectoryKind } from "@prisma/client";
import { listDirectory } from "@/services/directory-service";
import { createDirectoryEntryAction } from "@/actions/directory-actions";
import { DirectoryForm } from "@/components/directory/DirectoryForm";
import { Card, CardLabel } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { RowLink } from "@/components/ui/RowLink";
import { Pagination } from "@/components/ui/Pagination";
import { DIRECTORY, directoryRef } from "@/lib/directory";
import { PAGE_SIZES, paginate, parsePage } from "@/lib/pagination";

const TH = "px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-gink";
const TD = "px-4 py-2";

/** Shared list + create page for /vendors, /staff and /partners. */
export async function DirectoryListPage({ kind, params }: { kind: DirectoryKind; params: Record<string, string | undefined> }) {
  const cfg = DIRECTORY[kind];
  const q = params.q?.trim() || undefined;
  const all = await listDirectory(kind, q);
  const { page: requested, size } = parsePage(params);
  const { rows, page } = paginate(all, requested, size);

  return (
    <div className="space-y-5">
      <PageHeader title={cfg.title} />

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr] lg:items-start">
        <Card>
          <CardLabel>New {cfg.singular}</CardLabel>
          <DirectoryForm
            action={createDirectoryEntryAction.bind(null, kind)}
            contactLabel={cfg.contactLabel}
            namePlaceholder={cfg.namePlaceholder}
            submitLabel={`Save ${cfg.singular}`}
          />
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-2">
              <CardLabel>All {cfg.title.toLowerCase()}</CardLabel>
              <span className="-mt-4 rounded-full bg-ghover px-2.5 py-0.5 text-xs font-medium text-ggrey">{all.length}</span>
            </div>
            <form method="get" className="w-full sm:w-64">
              <Input name="q" type="search" placeholder="Search name, contact, email…" defaultValue={q} className="h-9 text-[13px]" />
            </form>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-y-2 border-gline bg-gbg text-left">
                <tr>
                  <th className={TH}>ID</th>
                  <th className={TH}>Name</th>
                  <th className={TH}>{cfg.contactLabel}</th>
                  <th className={TH}>Email</th>
                  <th className={TH}>Phone</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <RowLink key={e.id} href={`/${cfg.slug}/${e.id}`} className="border-b border-gline-2 transition-colors last:border-0 hover:bg-ghover/70">
                    <td className={`${TD} whitespace-nowrap font-medium tabular-nums text-ggrey-2`}>{directoryRef(kind, e.number)}</td>
                    <td className={TD}>
                      <Link href={`/${cfg.slug}/${e.id}`} className="flex items-center gap-3 font-medium text-gink hover:text-gblue">
                        <Avatar name={e.name} size={24} />
                        {e.name}
                      </Link>
                    </td>
                    <td className={`${TD} text-gink-2`}>{e.contactName ?? "—"}</td>
                    <td className={`${TD} text-gink-2`}>{e.email ? <a href={`mailto:${e.email}`} className="hover:text-gblue">{e.email}</a> : "—"}</td>
                    <td className={`${TD} whitespace-nowrap text-gink-2`}>{e.phone ?? "—"}</td>
                  </RowLink>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-ggrey">
                      {q ? `No ${cfg.title.toLowerCase()} match "${q}".` : `No ${cfg.title.toLowerCase()} yet — add the first one on the left.`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {all.length > 0 && (
            <Pagination pathname={`/${cfg.slug}`} query={q ? { q } : {}} page={page} size={size} total={all.length} sizes={PAGE_SIZES} />
          )}
        </Card>
      </div>
    </div>
  );
}
