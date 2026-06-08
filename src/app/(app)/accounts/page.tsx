import Link from "next/link";
import { listAccounts } from "@/services/account-service";
import { createAccountAction } from "@/actions/account-actions";
import { AccountForm } from "@/components/accounts/AccountForm";
import { Card } from "@/components/ui/Card";

export default async function AccountsPage() {
  const accounts = await listAccounts();
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium">Accounts</h1>
      </div>
      <Card>
        <h2 className="mb-4 text-sm font-medium text-neutral-500">New account</h2>
        <AccountForm action={createAccountAction} />
      </Card>
      <Card className="p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-left text-neutral-500">
            <tr><th className="p-4">#</th><th className="p-4">Name</th><th className="p-4">Industry</th><th className="p-4">Opportunities</th></tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                <td className="p-4 text-neutral-400">{a.number}</td>
                <td className="p-4"><Link href={`/accounts/${a.id}`} className="text-blue-600 hover:underline">{a.name}</Link></td>
                <td className="p-4">{a.industry ?? "—"}</td>
                <td className="p-4">{a._count.opportunities}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
