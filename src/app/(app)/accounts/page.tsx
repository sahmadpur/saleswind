import Link from "next/link";
import { listAccounts } from "@/services/account-service";
import { createAccountAction } from "@/actions/account-actions";
import { AccountForm } from "@/components/accounts/AccountForm";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { RowLink } from "@/components/ui/RowLink";
import { Pagination } from "@/components/ui/Pagination";
import { CreateDialogButton } from "@/components/ui/CreateDialogButton";
import { accountRef } from "@/lib/format";
import { PAGE_SIZES, paginate, parsePage } from "@/lib/pagination";

const TH = "px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-gink";
const TD = "px-4 py-2";

export default async function AccountsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const all = await listAccounts(q);
  const { page: requested, size } = parsePage(params);
  const { rows, page } = paginate(all, requested, size);

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

      <form method="get" className="w-full sm:w-80">
        <Input name="q" type="search" placeholder="Search name, industry, contact…" defaultValue={q} className="h-9 text-[13px]" />
      </form>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b-2 border-gline bg-gbg text-left">
              <tr>
                <th className={TH}>ID</th>
                <th className={TH}>Name</th>
                <th className={TH}>Industry</th>
                <th className={TH}>Contact</th>
                <th className={TH}>Email</th>
                <th className={TH}>Phone</th>
                <th className={TH}>Website</th>
                <th className={`${TH} text-right`}>Opportunities</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <RowLink key={a.id} href={`/accounts/${a.id}`} className="border-b border-gline-2 transition-colors last:border-0 hover:bg-ghover/70">
                  <td className={`${TD} whitespace-nowrap font-medium tabular-nums text-ggrey-2`}>{accountRef(a.number)}</td>
                  <td className={TD}>
                    <Link href={`/accounts/${a.id}`} className="flex items-center gap-3 whitespace-nowrap font-medium text-gink hover:text-gblue">
                      <Avatar name={a.name} size={24} />
                      {a.name}
                    </Link>
                  </td>
                  <td className={`${TD} text-gink-2`}>{a.industry ?? "—"}</td>
                  <td className={`${TD} whitespace-nowrap text-gink-2`}>{a.primaryContactName ?? "—"}</td>
                  <td className={`${TD} text-gink-2`}>
                    {a.primaryContactEmail ? <a href={`mailto:${a.primaryContactEmail}`} className="hover:text-gblue">{a.primaryContactEmail}</a> : "—"}
                  </td>
                  <td className={`${TD} whitespace-nowrap text-gink-2`}>{a.primaryContactPhone ?? "—"}</td>
                  <td className={`${TD} text-gink-2`}>
                    {a.website ? <a href={a.website} target="_blank" rel="noreferrer" className="hover:text-gblue">{a.website.replace(/^https?:\/\//, "")}</a> : "—"}
                  </td>
                  <td className={`${TD} text-right tabular-nums text-gink-2`}>{a._count.opportunities}</td>
                </RowLink>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-ggrey">
                    {q ? `No accounts match "${q}".` : "No accounts yet — click New account to add the first one."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {all.length > 0 && (
          <Pagination pathname="/accounts" query={q ? { q } : {}} page={page} size={size} total={all.length} sizes={PAGE_SIZES} />
        )}
      </Card>
    </div>
  );
}
