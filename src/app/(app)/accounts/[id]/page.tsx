import Link from "next/link";
import { notFound } from "next/navigation";
import { getAccount } from "@/services/account-service";
import { updateAccountAction, updateAccountNotesAction } from "@/actions/account-actions";
import { AccountForm } from "@/components/accounts/AccountForm";
import { EditDialogButton } from "@/components/ui/EditDialogButton";
import { AccountNotesForm } from "@/components/accounts/AccountNotesForm";
import { Card, CardLabel } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { StatusPill } from "@/components/ui/StatusPill";
import { Avatar } from "@/components/ui/Avatar";
import { RowLink } from "@/components/ui/RowLink";
import { accountRef } from "@/lib/format";

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

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={account.name} size={56} />
          <div>
            <h1 className="text-[1.75rem] font-normal leading-tight tracking-[-0.01em] text-gink">{account.name}</h1>
            <p className="text-sm text-ggrey">
              <span className="font-medium tabular-nums text-ggrey-2">{accountRef(account.number)}</span>
              <span className="mx-1.5 text-gline">·</span>
              {account.industry ?? "Account"}
            </p>
          </div>
        </div>
        <EditDialogButton title="Edit account">
          <AccountForm
            action={updateAccountAction.bind(null, account.id)}
            submitLabel="Save changes"
            defaults={{
              name: account.name, industry: account.industry ?? "", website: account.website ?? "",
              primaryContactName: account.primaryContactName ?? "", primaryContactEmail: account.primaryContactEmail ?? "",
              primaryContactPhone: account.primaryContactPhone ?? "", notes: account.notes ?? "",
            }}
          />
        </EditDialogButton>
      </div>

      <Card>
        <CardLabel>Details</CardLabel>
        <dl className="grid gap-5 sm:grid-cols-2">
          <Field icon="factory" label="Industry" value={account.industry ?? "—"} />
          <Field icon="language" label="Website" value={account.website ?? "—"} />
          <Field icon="person" label="Contact" value={account.primaryContactName ?? "—"} />
          <Field icon="mail" label="Email" value={account.primaryContactEmail ?? "—"} />
          <Field icon="call" label="Phone" value={account.primaryContactPhone ?? "—"} />
        </dl>
      </Card>

      <Card>
        <CardLabel>Notes</CardLabel>
        <AccountNotesForm action={updateAccountNotesAction.bind(null, account.id)} notes={account.notes ?? ""} />
      </Card>

      <Card className="overflow-hidden p-0">
        <h2 className="px-6 pb-4 pt-6 text-sm font-medium text-gink">Opportunities</h2>
        <table className="w-full text-sm">
          <thead className="border-y border-gline-2 bg-gbg text-left">
            <tr>
              <th className="px-6 py-2 text-xs font-medium uppercase tracking-wide text-ggrey">Title</th>
              <th className="px-6 py-2 text-xs font-medium uppercase tracking-wide text-ggrey">Stage</th>
              <th className="px-6 py-2 text-xs font-medium uppercase tracking-wide text-ggrey">Status</th>
              <th className="px-6 py-2"><span className="sr-only">Open</span></th>
            </tr>
          </thead>
          <tbody>
            {account.opportunities.map((o) => (
              <RowLink key={o.id} href={`/opportunities/${o.id}`} className="border-t border-gline-2 first:border-0 transition-colors hover:bg-gblue-50/60">
                <td className="px-6 py-2.5">
                  <Link href={`/opportunities/${o.id}`} className="font-medium text-gblue hover:underline">{o.title}</Link>
                </td>
                <td className="px-6 py-2.5"><Pill stage={o.stage} /></td>
                <td className="px-6 py-2.5 text-gink-2">{o.status ? <StatusPill label={o.status.label} color={o.status.color} /> : "—"}</td>
              </RowLink>
            ))}
            {account.opportunities.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-10 text-center text-sm text-ggrey">No opportunities for this account yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
