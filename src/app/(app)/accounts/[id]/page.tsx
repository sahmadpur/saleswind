import Link from "next/link";
import { notFound } from "next/navigation";
import { getAccount } from "@/services/account-service";
import { Card, CardLabel } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Avatar } from "@/components/ui/Avatar";

function Field({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ghover text-ggrey">
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
      </span>
      <div>
        <dt className="text-xs text-ggrey">{label}</dt>
        <dd className="text-sm text-gink">{value}</dd>
      </div>
    </div>
  );
}

export default async function AccountDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await getAccount(id);
  if (!account) notFound();
  return (
    <div className="space-y-6">
      <Link href="/accounts" className="inline-flex items-center gap-1 text-sm text-ggrey transition-colors hover:text-gblue">
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
        Accounts
      </Link>

      <div className="flex items-center gap-4">
        <Avatar name={account.name} size={56} />
        <div>
          <h1 className="text-[1.75rem] font-normal leading-tight tracking-[-0.01em] text-gink">{account.name}</h1>
          <p className="text-sm text-ggrey">{account.industry ?? "Account"}</p>
        </div>
      </div>

      <Card>
        <CardLabel>Details</CardLabel>
        <dl className="grid gap-5 sm:grid-cols-2">
          <Field icon="factory" label="Industry" value={account.industry ?? "—"} />
          <Field icon="language" label="Website" value={account.website ?? "—"} />
          <Field icon="person" label="Contact" value={account.primaryContactName ?? "—"} />
          <Field icon="mail" label="Email" value={account.primaryContactEmail ?? "—"} />
        </dl>
      </Card>

      <Card className="overflow-hidden p-0">
        <h2 className="px-6 pb-4 pt-6 text-sm font-medium text-gink">Opportunities</h2>
        <table className="w-full text-sm">
          <tbody>
            {account.opportunities.map((o) => (
              <tr key={o.id} className="border-t border-gline-2 transition-colors hover:bg-gblue-50/60">
                <td className="px-6 py-3.5">
                  <Link href={`/opportunities/${o.id}`} className="font-medium text-gblue hover:underline">{o.title}</Link>
                </td>
                <td className="px-6 py-3.5"><Pill state={o.state} /></td>
                <td className="px-6 py-3.5 text-gink-2">{o.status?.label ?? "—"}</td>
              </tr>
            ))}
            {account.opportunities.length === 0 && (
              <tr>
                <td className="px-6 py-10 text-center text-sm text-ggrey">No opportunities for this account yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
