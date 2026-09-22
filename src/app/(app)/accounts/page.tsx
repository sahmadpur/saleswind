import { getCurrentUser } from "@/lib/session";
import { can } from "@/lib/domain/permissions";
import { listAccounts } from "@/services/account-service";
import { createAccountAction } from "@/actions/account-actions";
import { AccountForm } from "@/components/accounts/AccountForm";
import { AccountTable, ACCOUNTS_SCOPE, type AccountRow } from "@/components/accounts/AccountTable";
import { TableFilterBar } from "@/components/ui/TableFilterBar";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { ResetColumnWidths } from "@/components/ui/ColResizer";
import { CreateDialogButton } from "@/components/ui/CreateDialogButton";
import { accountRef } from "@/lib/format";
import { PAGE_SIZES, paginate, parsePage } from "@/lib/pagination";
import { ACCOUNT_SORT } from "@/lib/list-sort";
import {
  applyFilters, distinct, haystack, matchesSearch, param, parseListSort, parseMultiFilters,
  sortList, type QueryParams,
} from "@/lib/table";

const FILTER_KEYS = ["industry"] as const;
const RESET = "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-gblue transition-colors hover:bg-gblue-50 disabled:cursor-default disabled:text-ggrey-2 disabled:hover:bg-transparent";

const searchable = (a: AccountRow) =>
  haystack([accountRef(a.number), a.name, a.industry, a.primaryContactName, a.primaryContactEmail, a.primaryContactPhone, a.website]);

export default async function AccountsPage({ searchParams }: { searchParams: Promise<QueryParams> }) {
  const params = await searchParams;
  const [all, user] = await Promise.all([listAccounts(), getCurrentUser()]);
  const canEdit = !!user && can(user.role, "account:write");

  const q = param(params, "q")?.trim() || undefined;
  const filters = parseMultiFilters(params, FILTER_KEYS);
  const { sort, dir } = parseListSort(ACCOUNT_SORT, param(params, "sort"), param(params, "dir"));
  const { page: requested, size } = parsePage({ page: param(params, "page"), size: param(params, "size") });

  const narrowed = applyFilters(all, filters, { industry: (a) => a.industry ?? "" });
  const matched = q ? narrowed.filter((a) => matchesSearch(searchable(a), q)) : narrowed;
  const sorted = sortList(matched, ACCOUNT_SORT, sort, dir);
  const { rows, page } = paginate(sorted, requested, size);

  const query = new URLSearchParams();
  for (const v of filters.industry) query.append("industry", v);
  if (q) query.set("q", q);
  query.set("sort", sort);
  query.set("dir", dir);
  if (size !== PAGE_SIZES[0]) query.set("size", String(size));

  const filtered = !!q || filters.industry.length > 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Accounts"
        actions={
          <CreateDialogButton label="New account" title="New account">
            <AccountForm action={createAccountAction} />
          </CreateDialogButton>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <TableFilterBar
          pathname="/accounts"
          q={q ?? ""}
          searchLabel="Search accounts"
          searchPlaceholder="Search name, industry, contact…"
          filters={filters}
          defs={[{ key: "industry", label: "Industry", allLabel: "All industries", options: distinct(all.map((a) => a.industry)).map((v) => ({ value: v, label: v })) }]}
          keep={{ sort, dir, ...(size !== PAGE_SIZES[0] && { size: String(size) }) }}
        />
        <ResetColumnWidths scope={ACCOUNTS_SCOPE} className={RESET} />
      </div>

      <Card className="overflow-hidden p-0">
        <AccountTable
          rows={rows}
          sort={sort}
          dir={dir}
          query={query}
          filtered={filtered}
          canEdit={canEdit}
          footer={sorted.length > 0 ? <Pagination pathname="/accounts" query={query} page={page} size={size} total={sorted.length} sizes={PAGE_SIZES} /> : undefined}
        />
      </Card>
    </div>
  );
}
