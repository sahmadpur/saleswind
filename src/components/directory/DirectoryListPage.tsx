import Link from "next/link";
import type { DirectoryKind } from "@prisma/client";
import { listDirectory } from "@/services/directory-service";
import { createDirectoryEntryAction, updateDirectoryEntryAction } from "@/actions/directory-actions";
import { DirectoryForm } from "@/components/directory/DirectoryForm";
import { EditDialogButton } from "@/components/ui/EditDialogButton";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { RowLink } from "@/components/ui/RowLink";
import { Pagination } from "@/components/ui/Pagination";
import { CreateDialogButton } from "@/components/ui/CreateDialogButton";
import { DIRECTORY, directoryRef } from "@/lib/directory";
import { PAGE_SIZES, paginate, parsePage } from "@/lib/pagination";

const TH = "px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-gink";
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
      <PageHeader
        title={cfg.title}
        actions={
          <CreateDialogButton label={`New ${cfg.singular}`} title={`New ${cfg.singular}`}>
            <DirectoryForm
              action={createDirectoryEntryAction.bind(null, kind)}
              contactLabel={cfg.contactLabel}
              namePlaceholder={cfg.namePlaceholder}
              submitLabel={`Save ${cfg.singular}`}
            />
          </CreateDialogButton>
        }
      />

      <form method="get" className="w-full sm:w-80">
        <Input name="q" type="search" placeholder="Search name, contact, email…" defaultValue={q} className="h-9 text-[13px]" />
      </form>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b-2 border-gline bg-gbg text-left">
              <tr>
                <th className={TH}>ID</th>
                <th className={TH}>Name</th>
                <th className={TH}>{cfg.contactLabel}</th>
                <th className={TH}>Email</th>
                <th className={TH}>Phone</th>
                <th className={TH}>Website</th>
                <th className={TH}><span className="sr-only">Edit</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <RowLink key={e.id} href={`/${cfg.slug}/${e.id}`} className="border-b border-gline-2 transition-colors last:border-0 hover:bg-ghover/70">
                  <td className={`${TD} whitespace-nowrap font-medium tabular-nums text-ggrey-2`}>{directoryRef(kind, e.number)}</td>
                  <td className={TD}>
                    <Link href={`/${cfg.slug}/${e.id}`} className="flex items-center gap-3 whitespace-nowrap font-medium text-gink hover:text-gblue">
                      <Avatar name={e.name} size={24} />
                      {e.name}
                    </Link>
                  </td>
                  <td className={`${TD} whitespace-nowrap text-gink-2`}>{e.contactName ?? "—"}</td>
                  <td className={`${TD} text-gink-2`}>{e.email ? <a href={`mailto:${e.email}`} className="hover:text-gblue">{e.email}</a> : "—"}</td>
                  <td className={`${TD} whitespace-nowrap text-gink-2`}>{e.phone ?? "—"}</td>
                  <td className={`${TD} text-gink-2`}>
                    {e.website ? <a href={e.website} target="_blank" rel="noreferrer" className="hover:text-gblue">{e.website.replace(/^https?:\/\//, "")}</a> : "—"}
                  </td>
                  <td className={`${TD} w-10 py-1 text-right`}>
                    <EditDialogButton title={`Edit ${e.name}`} compact>
                      <DirectoryForm
                        action={updateDirectoryEntryAction.bind(null, e.id)}
                        defaults={{ name: e.name, contactName: e.contactName ?? "", email: e.email ?? "", phone: e.phone ?? "", website: e.website ?? "", notes: e.notes ?? "" }}
                        contactLabel={cfg.contactLabel}
                        namePlaceholder={cfg.namePlaceholder}
                        submitLabel="Save changes"
                      />
                    </EditDialogButton>
                  </td>
                </RowLink>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-ggrey">
                    {q ? `No ${cfg.title.toLowerCase()} match "${q}".` : `No ${cfg.title.toLowerCase()} yet — click New ${cfg.singular} to add the first one.`}
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
  );
}
