import Link from "next/link";
import type { DirectoryKind } from "@prisma/client";
import { Avatar } from "@/components/ui/Avatar";
import { RowLink } from "@/components/ui/RowLink";
import { SortableTH } from "@/components/ui/SortableTH";
import { ColResizer, RestoreColumnWidths } from "@/components/ui/ColResizer";
import { EditableCell } from "@/components/ui/EditableCell";
import { EditDialogButton } from "@/components/ui/EditDialogButton";
import { DirectoryForm } from "@/components/directory/DirectoryForm";
import { updateDirectoryEntryAction, updateDirectoryFieldAction } from "@/actions/directory-actions";
import type { DirectoryField } from "@/schemas/directory";
import { DIRECTORY, directoryRef } from "@/lib/directory";
import { DIRECTORY_SORT, type DirectorySortKey } from "@/lib/list-sort";
import type { SortDir } from "@/lib/table";

export type DirectoryRow = {
  id: string; number: number; name: string; contactName: string | null;
  email: string | null; phone: string | null; website: string | null; notes: string | null;
};

/** Widths are saved per directory, so Vendors and Staff don't fight over the same columns. */
export const directoryScope = (kind: DirectoryKind) => `directory:${kind.toLowerCase()}`;

const TH = "relative px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-gink";
const TD = "px-3 py-2";
const DASH = <span className="text-ggrey-2">—</span>;

function BodyRow({ e, kind, canEdit }: { e: DirectoryRow; kind: DirectoryKind; canEdit: boolean }) {
  const cfg = DIRECTORY[kind];
  const href = `/${cfg.slug}/${e.id}`;
  const save = (field: DirectoryField) => updateDirectoryFieldAction.bind(null, e.id, field);
  const nameLink = (
    <Link href={href} className="flex min-w-0 items-center gap-2 whitespace-nowrap font-medium text-gink hover:text-gblue">
      <Avatar name={e.name} size={24} />
      <span className="truncate">{e.name}</span>
    </Link>
  );
  const cell = (field: DirectoryField, value: string | null, display: React.ReactNode, label: string) =>
    canEdit
      ? <EditableCell value={value ?? ""} display={value ? display : DASH} kind="text" save={save(field)} label={label} />
      : (value ? display : DASH);

  return (
    <RowLink href={href} className="border-b border-gline-2 transition-colors last:border-0 hover:bg-ghover/70">
      <td className={`${TD} whitespace-nowrap font-medium tabular-nums text-ggrey-2`}>{directoryRef(kind, e.number)}</td>
      <td className={`${TD} max-w-[14rem]`}>
        {canEdit ? <EditableCell value={e.name} display={nameLink} kind="text" save={save("name")} label="name" iconTrigger /> : nameLink}
      </td>
      <td className={`${TD} whitespace-nowrap text-gink-2`}>{cell("contactName", e.contactName, e.contactName, cfg.contactLabel.toLowerCase())}</td>
      <td className={`${TD} text-gink-2`}>
        {cell("email", e.email, <a href={`mailto:${e.email}`} className="hover:text-gblue">{e.email}</a>, "email")}
      </td>
      <td className={`${TD} whitespace-nowrap text-gink-2`}>{cell("phone", e.phone, e.phone, "phone")}</td>
      <td className={`${TD} text-gink-2`}>
        {cell("website", e.website,
          <a href={e.website ?? ""} target="_blank" rel="noreferrer" className="hover:text-gblue">{e.website?.replace(/^https?:\/\//, "")}</a>, "website")}
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
  );
}

export function DirectoryTable({ kind, rows, sort, dir, query, filtered, canEdit, footer }: {
  kind: DirectoryKind; rows: DirectoryRow[]; sort: DirectorySortKey; dir: SortDir; query: URLSearchParams;
  filtered: boolean; canEdit: boolean; footer?: React.ReactNode;
}) {
  const cfg = DIRECTORY[kind];
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-ghover text-ggrey-2">
          <span className="material-symbols-outlined" style={{ fontSize: 28 }}>{filtered ? "filter_alt_off" : cfg.icon}</span>
        </span>
        <p className="text-sm font-medium text-gink">
          {filtered ? `No ${cfg.title.toLowerCase()} match this search` : `No ${cfg.title.toLowerCase()} yet`}
        </p>
        {!filtered && <p className="max-w-xs text-sm text-ggrey">Click New {cfg.singular} to add the first one.</p>}
      </div>
    );
  }
  const scope = directoryScope(kind);
  const sortable = { sort, dir, defaultDir: DIRECTORY_SORT.defaultDir, pathname: `/${cfg.slug}`, extraQuery: query, className: TH, children: <ColResizer /> };
  return (
    <>
      <div className="overflow-x-auto">
        <RestoreColumnWidths scope={scope} />
        <table data-resizable={scope} className="w-full text-[13px] leading-5">
          <thead className="border-b-2 border-gline bg-gbg text-left">
            <tr>
              <SortableTH label="ID" sortKey="ref" {...sortable} />
              <SortableTH label="Name" sortKey="name" {...sortable} />
              <SortableTH label={cfg.contactLabel} sortKey="contact" {...sortable} />
              <SortableTH label="Email" sortKey="email" {...sortable} />
              <SortableTH label="Phone" sortKey="phone" {...sortable} />
              <SortableTH label="Website" sortKey="website" {...sortable} />
              <th data-col="Edit" className={TH}><span className="sr-only">Edit</span><ColResizer /></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => <BodyRow key={e.id} e={e} kind={kind} canEdit={canEdit} />)}
          </tbody>
        </table>
      </div>
      {footer}
    </>
  );
}
