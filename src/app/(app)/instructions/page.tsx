import { requireUser } from "@/lib/session";
import { can } from "@/lib/domain/permissions";
import { db } from "@/lib/db";
import { getPage } from "@/services/page-service";
import { saveInstructionsAction } from "@/actions/page-actions";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Markdown } from "@/components/content/Markdown";
import { InstructionsView } from "@/components/content/InstructionsView";
import { shortDate } from "@/lib/format";

export default async function InstructionsPage() {
  const user = await requireUser();
  const page = await getPage("instructions");
  const editor = page?.updatedById ? await db.user.findUnique({ where: { id: page.updatedById }, select: { name: true } }) : null;
  const body = page?.body ?? "";

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader title="Instructions" />
      <Card>
        <InstructionsView canEdit={can(user.role, "dictionary:manage")} body={body} action={saveInstructionsAction}>
          {body.trim() ? (
            <Markdown>{body}</Markdown>
          ) : (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-ghover text-ggrey-2">
                <span className="material-symbols-outlined" style={{ fontSize: 28 }}>menu_book</span>
              </span>
              <p className="text-sm font-medium text-gink">Content coming soon</p>
              <p className="max-w-xs text-sm text-ggrey">Instructions for using Saleswind will appear here.</p>
            </div>
          )}
        </InstructionsView>
        {page && body.trim() && (
          <p className="mt-6 border-t border-gline-2 pt-3 text-xs text-ggrey-2">
            Last updated {shortDate(page.updatedAt)}{editor ? ` by ${editor.name}` : ""}
          </p>
        )}
      </Card>
    </div>
  );
}
