import Link from "next/link";
import { listAccounts } from "@/services/account-service";
import { createAccountAction } from "@/actions/account-actions";
import { AccountForm } from "@/components/accounts/AccountForm";
import { Card, CardLabel } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Avatar } from "@/components/ui/Avatar";

const TH = "px-5 py-3 text-xs font-medium uppercase tracking-wide text-ggrey";

export default async function AccountsPage() {
  const accounts = await listAccounts();
  return (
    <div className="space-y-8">
      <PageHeader title="Accounts" subtitle="Companies you do business with" />

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr] lg:items-start">
        <Card>
          <CardLabel>New account</CardLabel>
          <AccountForm action={createAccountAction} />
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between px-5 py-4">
            <CardLabel>All accounts</CardLabel>
            <span className="rounded-full bg-ghover px-2.5 py-0.5 text-xs font-medium text-ggrey">
              {accounts.length}
            </span>
          </div>
          <table className="w-full text-sm">
            <thead className="border-y border-gline-2 bg-gbg text-left">
              <tr>
                <th className={TH}>#</th>
                <th className={TH}>Name</th>
                <th className={TH}>Industry</th>
                <th className={`${TH} text-right`}>Opportunities</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-b border-gline-2 transition-colors last:border-0 hover:bg-gblue-50/60">
                  <td className="px-5 py-3 text-ggrey-2 tabular-nums">{a.number}</td>
                  <td className="px-5 py-3">
                    <Link href={`/accounts/${a.id}`} className="flex items-center gap-3 font-medium text-gink hover:text-gblue">
                      <Avatar name={a.name} size={28} />
                      {a.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gink-2">{a.industry ?? "—"}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-gink-2">{a._count.opportunities}</td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-sm text-ggrey">
                    No accounts yet — add your first one on the left.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
