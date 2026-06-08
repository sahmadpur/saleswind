import Link from "next/link";
import { notFound } from "next/navigation";
import { getAccount } from "@/services/account-service";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";

export default async function AccountDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await getAccount(id);
  if (!account) notFound();
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-medium">{account.name}</h1>
      <Card>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div><dt className="text-neutral-500">Industry</dt><dd>{account.industry ?? "—"}</dd></div>
          <div><dt className="text-neutral-500">Website</dt><dd>{account.website ?? "—"}</dd></div>
          <div><dt className="text-neutral-500">Contact</dt><dd>{account.primaryContactName ?? "—"}</dd></div>
          <div><dt className="text-neutral-500">Email</dt><dd>{account.primaryContactEmail ?? "—"}</dd></div>
        </dl>
      </Card>
      <Card className="p-0">
        <h2 className="p-4 text-sm font-medium text-neutral-500">Opportunities</h2>
        <table className="w-full text-sm">
          <tbody>
            {account.opportunities.map((o) => (
              <tr key={o.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                <td className="p-4"><Link href={`/opportunities/${o.id}`} className="text-blue-600 hover:underline">{o.title}</Link></td>
                <td className="p-4"><Pill state={o.state} /></td>
                <td className="p-4">{o.status?.label ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
