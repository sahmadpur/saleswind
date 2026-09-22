import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { RowLink } from "@/components/ui/RowLink";
import { SortableTH } from "@/components/ui/SortableTH";
import { ColResizer, RestoreColumnWidths } from "@/components/ui/ColResizer";
import { EditableCell } from "@/components/ui/EditableCell";
import { EditDialogButton } from "@/components/ui/EditDialogButton";
import { AccountForm } from "@/components/accounts/AccountForm";
import { updateAccountAction, updateAccountFieldAction } from "@/actions/account-actions";
import type { AccountField } from "@/schemas/account";
import { ACCOUNT_SORT, type AccountSortKey } from "@/lib/list-sort";
import { accountRef } from "@/lib/format";
import type { SortDir } from "@/lib/table";

export type AccountRow = {
  id: string; number: number; name: string; industry: string | null; website: string | null;
  primaryContactName: string | null; primaryContactEmail: string | null; primaryContactPhone: string | null;
  notes: string | null; _count: { opportunities: number };
};

export const ACCOUNTS_SCOPE = "accounts";

const TH = "relative px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-gink";
const TD = "px-3 py-2";
const DASH = <span className="text-ggrey-2">—</span>;

function BodyRow({ a, canEdit }: { a: AccountRow; canEdit: boolean }) {
  const save = (field: AccountField) => updateAccountFieldAction.bind(null, a.id, field);
  const nameLink = (
    <Link href={`/accounts/${a.id}`} className="flex min-w-0 items-center gap-2 whitespace-nowrap font-medium text-gink hover:text-gblue">
      <Avatar name={a.name} size={24} />
      <span className="truncate">{a.name}</span>
    </Link>
  );
  const cell = (field: AccountField, value: string | null, display: React.ReactNode, label: string) =>
    canEdit
      ? <EditableCell value={value ?? ""} display={value ? display : DASH} kind="text" save={save(field)} label={label} />
      : (value ? display : DASH);

  return (
    <RowLink href={`/accounts/${a.id}`} className="border-b border-gline-2 transition-colors last:border-0 hover:bg-ghover/70">
      <td className={`${TD} whitespace-nowrap font-medium tabular-nums text-ggrey-2`}>{accountRef(a.number)}</td>
      <td className={`${TD} max-w-[14rem]`}>
        {canEdit ? <EditableCell value={a.name} display={nameLink} kind="text" save={save("name")} label="name" iconTrigger /> : nameLink}
      </td>
      <td className={`${TD} text-gink-2`}>{cell("industry", a.industry, a.industry, "industry")}</td>
      <td className={`${TD} whitespace-nowrap text-gink-2`}>{cell("primaryContactName", a.primaryContactName, a.primaryContactName, "contact")}</td>
      <td className={`${TD} text-gink-2`}>
        {cell("primaryContactEmail", a.primaryContactEmail,
          <a href={`mailto:${a.primaryContactEmail}`} className="hover:text-gblue">{a.primaryContactEmail}</a>, "email")}
      </td>
      <td className={`${TD} whitespace-nowrap text-gink-2`}>{cell("primaryContactPhone", a.primaryContactPhone, a.primaryContactPhone, "phone")}</td>
      <td className={`${TD} text-gink-2`}>
        {cell("website", a.website,
          <a href={a.website ?? ""} target="_blank" rel="noreferrer" className="hover:text-gblue">{a.website?.replace(/^https?:\/\//, "")}</a>, "website")}
      </td>
      <td className={`${TD} text-right tabular-nums text-gink-2`}>{a._count.opportunities}</td>
      <td className={`${TD} w-10 py-1 text-right`}>
        <EditDialogButton title={`Edit ${a.name}`} compact>
          <AccountForm
            action={updateAccountAction.bind(null, a.id)}
            submitLabel="Save changes"
            defaults={{
              name: a.name, industry: a.industry ?? "", website: a.website ?? "",
              primaryContactName: a.primaryContactName ?? "", primaryContactEmail: a.primaryContactEmail ?? "",
              primaryContactPhone: a.primaryContactPhone ?? "", notes: a.notes ?? "",
            }}
          />
        </EditDialogButton>
      </td>
    </RowLink>
  );
}

export function AccountTable({ rows, sort, dir, query, filtered, canEdit, footer }: {
  rows: AccountRow[]; sort: AccountSortKey; dir: SortDir; query: URLSearchParams; filtered: boolean;
  canEdit: boolean; footer?: React.ReactNode;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-ghover text-ggrey-2">
          <span className="material-symbols-outlined" style={{ fontSize: 28 }}>{filtered ? "filter_alt_off" : "domain"}</span>
        </span>
        <p className="text-sm font-medium text-gink">{filtered ? "No accounts match these filters" : "No accounts yet"}</p>
        {!filtered && <p className="max-w-xs text-sm text-ggrey">Click New account to add the first one.</p>}
      </div>
    );
  }
  const sortable = { sort, dir, defaultDir: ACCOUNT_SORT.defaultDir, pathname: "/accounts", extraQuery: query, className: TH, children: <ColResizer /> };
  return (
    <>
      <div className="overflow-x-auto">
        <RestoreColumnWidths scope={ACCOUNTS_SCOPE} />
        <table data-resizable={ACCOUNTS_SCOPE} className="w-full text-[13px] leading-5">
          <thead className="border-b-2 border-gline bg-gbg text-left">
            <tr>
              <SortableTH label="ID" sortKey="ref" {...sortable} />
              <SortableTH label="Name" sortKey="name" {...sortable} />
              <SortableTH label="Industry" sortKey="industry" {...sortable} />
              <SortableTH label="Contact" sortKey="contact" {...sortable} />
              <SortableTH label="Email" sortKey="email" {...sortable} />
              <SortableTH label="Phone" sortKey="phone" {...sortable} />
              <SortableTH label="Website" sortKey="website" {...sortable} />
              <SortableTH label="Opportunities" sortKey="opportunities" align="right" {...sortable} />
              <th data-col="Edit" className={TH}><span className="sr-only">Edit</span><ColResizer /></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => <BodyRow key={a.id} a={a} canEdit={canEdit} />)}
          </tbody>
        </table>
      </div>
      {footer}
    </>
  );
}
