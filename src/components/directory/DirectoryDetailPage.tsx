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
import { dateTime } from "@/lib/format";

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
              Updated {dateTime(e.updatedAt)}
            </p>
          </div>
        </div>
        <DeleteEntryButton action={deleteDirectoryEntryAction.bind(null, e.id)} name={e.name} />
      </div>

      <Card>
        <CardLabel>Details</CardLabel>
        <DirectoryForm
          action={updateDirectoryEntryAction.bind(null, e.id)}
          defaults={{ name: e.name, contactName: e.contactName ?? "", email: e.email ?? "", phone: e.phone ?? "", website: e.website ?? "", notes: e.notes ?? "" }}
          contactLabel={cfg.contactLabel}
          namePlaceholder={cfg.namePlaceholder}
          submitLabel="Save changes"
        />
      </Card>
    </div>
  );
}
