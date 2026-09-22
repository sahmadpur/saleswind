import type { DirectoryKind } from "@prisma/client";
import { getCurrentUser } from "@/lib/session";
import { can } from "@/lib/domain/permissions";
import { listDirectory } from "@/services/directory-service";
import { createDirectoryEntryAction } from "@/actions/directory-actions";
import { DirectoryForm } from "@/components/directory/DirectoryForm";
import { DirectoryTable, directoryScope, type DirectoryRow } from "@/components/directory/DirectoryTable";
import { TableFilterBar } from "@/components/ui/TableFilterBar";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { ResetColumnWidths } from "@/components/ui/ColResizer";
import { CreateDialogButton } from "@/components/ui/CreateDialogButton";
import { DIRECTORY, directoryRef } from "@/lib/directory";
import { PAGE_SIZES, paginate, parsePage } from "@/lib/pagination";
import { DIRECTORY_SORT } from "@/lib/list-sort";
import { haystack, matchesSearch, param, parseListSort, sortList, type QueryParams } from "@/lib/table";

const RESET = "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-gblue transition-colors hover:bg-gblue-50 disabled:cursor-default disabled:text-ggrey-2 disabled:hover:bg-transparent";

const searchable = (kind: DirectoryKind) => (e: DirectoryRow) =>
  haystack([directoryRef(kind, e.number), e.name, e.contactName, e.email, e.phone, e.website]);

/** Shared list + create page for /vendors, /staff and /partners. */
export async function DirectoryListPage({ kind, params }: { kind: DirectoryKind; params: QueryParams }) {
  const cfg = DIRECTORY[kind];
  const [all, user] = await Promise.all([listDirectory(kind), getCurrentUser()]);
  const canEdit = !!user && can(user.role, "directory:write");

  const q = param(params, "q")?.trim() || undefined;
  const { sort, dir } = parseListSort(DIRECTORY_SORT, param(params, "sort"), param(params, "dir"));
  const { page: requested, size } = parsePage({ page: param(params, "page"), size: param(params, "size") });

  const matched = q ? all.filter((e) => matchesSearch(searchable(kind)(e), q)) : all;
  const sorted = sortList(matched, DIRECTORY_SORT, sort, dir);
  const { rows, page } = paginate(sorted, requested, size);

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  query.set("sort", sort);
  query.set("dir", dir);
  if (size !== PAGE_SIZES[0]) query.set("size", String(size));

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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <TableFilterBar
          pathname={`/${cfg.slug}`}
          q={q ?? ""}
          searchLabel={`Search ${cfg.title.toLowerCase()}`}
          searchPlaceholder="Search name, contact, email…"
          filters={{}}
          defs={[]}
          keep={{ sort, dir, ...(size !== PAGE_SIZES[0] && { size: String(size) }) }}
        />
        <ResetColumnWidths scope={directoryScope(kind)} className={RESET} />
      </div>

      <Card className="overflow-hidden p-0">
        <DirectoryTable
          kind={kind}
          rows={rows}
          sort={sort}
          dir={dir}
          query={query}
          filtered={!!q}
          canEdit={canEdit}
          footer={sorted.length > 0 ? <Pagination pathname={`/${cfg.slug}`} query={query} page={page} size={size} total={sorted.length} sizes={PAGE_SIZES} /> : undefined}
        />
      </Card>
    </div>
  );
}
