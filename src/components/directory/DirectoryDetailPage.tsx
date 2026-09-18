import Link from "next/link";
import { notFound } from "next/navigation";
import type { DirectoryKind } from "@prisma/client";
import { getDirectoryEntry } from "@/services/directory-service";
import { deleteDirectoryEntryAction, updateDirectoryEntryAction } from "@/actions/directory-actions";
import { DirectoryForm } from "@/components/directory/DirectoryForm";
import { DeleteEntryButton } from "@/components/directory/DeleteEntryButton";
import { Card, CardLabel } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { DIRECTORY, directoryRef } from "@/lib/directory";
import { dateTime, shortDate } from "@/lib/format";
import { EditDialogButton } from "@/components/ui/EditDialogButton";

function Field({ icon, label, value, href }: { icon: string; label: string; value: string | null; href?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ghover text-ggrey">
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-ggrey">{label}</dt>
        <dd className="truncate text-sm text-gink">
          {value ? (href ? <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="hover:text-gblue">{value}</a> : value) : "—"}
        </dd>
      </div>
    </div>
  );
}

export async function DirectoryDetailPage({ kind, id }: { kind: DirectoryKind; id: string }) {
  const cfg = DIRECTORY[kind];
  const e = await getDirectoryEntry(kind, id);
  if (!e) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/${cfg.slug}`} className="inline-flex items-center gap-1 text-sm text-ggrey transition-colors hover:text-gblue">
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
        {cfg.title}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={e.name} size={56} />
          <div>
            <h1 className="text-[1.75rem] font-normal leading-tight tracking-[-0.01em] text-gink">{e.name}</h1>
            <p className="text-sm text-ggrey">
              <span className="font-medium tabular-nums text-ggrey-2">{directoryRef(kind, e.number)}</span>
              <span className="mx-1.5 text-gline">·</span>
              <span title={dateTime(e.updatedAt)}>Updated {shortDate(e.updatedAt)}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <EditDialogButton title={`Edit ${cfg.singular}`}>
            <DirectoryForm
              action={updateDirectoryEntryAction.bind(null, e.id)}
              defaults={{ name: e.name, contactName: e.contactName ?? "", email: e.email ?? "", phone: e.phone ?? "", website: e.website ?? "", notes: e.notes ?? "" }}
              contactLabel={cfg.contactLabel}
              namePlaceholder={cfg.namePlaceholder}
              submitLabel="Save changes"
            />
          </EditDialogButton>
          <DeleteEntryButton action={deleteDirectoryEntryAction.bind(null, e.id)} name={e.name} />
        </div>
      </div>

      <Card>
        <CardLabel>Details</CardLabel>
        <dl className="grid gap-5 sm:grid-cols-2">
          <Field icon="person" label={cfg.contactLabel} value={e.contactName} />
          <Field icon="mail" label="Email" value={e.email} href={e.email ? `mailto:${e.email}` : undefined} />
          <Field icon="call" label="Phone" value={e.phone} href={e.phone ? `tel:${e.phone}` : undefined} />
          <Field icon="language" label="Website" value={e.website?.replace(/^https?:\/\//, "") ?? null} href={e.website ?? undefined} />
        </dl>
      </Card>

      <Card>
        <CardLabel>Notes</CardLabel>
        <p className="whitespace-pre-wrap text-sm text-gink-2">{e.notes || <span className="text-ggrey">No notes yet.</span>}</p>
      </Card>
    </div>
  );
}
