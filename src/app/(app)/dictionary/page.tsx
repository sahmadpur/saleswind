import { requireRole } from "@/lib/session";
import { listVocabularies } from "@/services/dictionary-service";
import { addStatusAction, addTagAction, deleteDefinitionAction, deleteTagAction, toggleTagAction, upsertDefinitionAction } from "@/actions/dictionary-actions";
import { Card, CardLabel } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusChip } from "@/components/dictionary/StatusChip";
import { DictionaryDeleteButton } from "@/components/dictionary/DictionaryDeleteButton";

const STAGES = ["PROSPECT", "SALES", "CONTRACT", "PROJECT"] as const;

const STAGE_DOT: Record<string, string> = {
  PROSPECT: "bg-gyellow",
  SALES: "bg-gblue",
  CONTRACT: "bg-gviolet",
  PROJECT: "bg-ggreen",
};

function StageLabel({ stage }: { stage: string }) {
  return (
    <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ggrey">
      <span className={`h-1.5 w-1.5 rounded-full ${STAGE_DOT[stage]}`} />
      {stage}
    </div>
  );
}

export default async function DictionaryPage() {
  await requireRole("dictionary:manage");
  const { statuses, tags, definitions } = await listVocabularies();
  return (
    <div className="space-y-8">
      <PageHeader title="Dictionary" />

      <Card>
        <CardLabel>Statuses</CardLabel>
        <div className="grid gap-6 sm:grid-cols-2">
          {STAGES.map((s) => (
            <div key={s}>
              <StageLabel stage={s} />
              <div className="flex flex-wrap items-center gap-2">
                {statuses.filter((x) => x.stage === s).map((x) => (
                  <StatusChip key={x.id} id={x.id} label={x.label} color={x.color} isActive={x.isActive} />
                ))}
                <form action={addStatusAction} className="flex items-center gap-1.5">
                  <input type="hidden" name="stage" value={s} />
                  <input
                    name="label"
                    placeholder="New status"
                    className="h-8 w-32 rounded-md border border-gline bg-gsurface px-2.5 text-xs outline-none transition-colors hover:border-ggrey-2 focus:border-gblue focus:ring-2 focus:ring-gblue/25"
                  />
                  <Button type="submit" variant="ghost" className="h-8 px-3">Add</Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardLabel>Tags</CardLabel>
        <div className="grid gap-6 sm:grid-cols-2">
          {STAGES.map((s) => (
            <div key={s}>
              <StageLabel stage={s} />
              <div className="flex flex-wrap items-center gap-2">
                {tags.filter((x) => x.stage === s).map((x) => (
                  <div
                    key={x.id}
                    className={`inline-flex items-center rounded-md border text-xs font-medium ${
                      x.isActive ? "border-gline bg-gsurface text-gink-2" : "border-transparent bg-ghover text-ggrey-2"
                    }`}
                  >
                    <form action={toggleTagAction.bind(null, x.id)}>
                      <button
                        type="submit"
                        title={x.isActive ? "Click to deactivate" : "Click to activate"}
                        className={`g-press h-7 rounded-l-md pl-2.5 pr-1 transition-colors hover:bg-ghover ${x.isActive ? "" : "line-through"}`}
                      >
                        {x.label}
                      </button>
                    </form>
                    <DictionaryDeleteButton
                      action={deleteTagAction.bind(null, x.id)}
                      label={x.label}
                      confirmText={
                        x._count.opportunityTags
                          ? `Delete tag "${x.label}"? It will be removed from ${x._count.opportunityTags} ${x._count.opportunityTags === 1 ? "opportunity" : "opportunities"}.`
                          : `Delete tag "${x.label}"?`
                      }
                      className="rounded-r-md hover:bg-ghover"
                    />
                  </div>
                ))}
                <form action={addTagAction} className="flex items-center gap-1.5">
                  <input type="hidden" name="stage" value={s} />
                  <input
                    name="label"
                    placeholder="New tag"
                    className="h-8 w-32 rounded-md border border-gline bg-gsurface px-2.5 text-xs outline-none transition-colors hover:border-ggrey-2 focus:border-gblue focus:ring-2 focus:ring-gblue/25"
                  />
                  <Button type="submit" variant="ghost" className="h-8 px-3">Add</Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardLabel>Definitions</CardLabel>
        <ul className="mb-5 divide-y divide-gline-2">
          {definitions.map((d) => (
            <li key={d.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
              <span>
                <span className="font-medium text-gink">{d.term}</span>
                <span className="text-ggrey"> — {d.definition}</span>
              </span>
              <DictionaryDeleteButton
                action={deleteDefinitionAction.bind(null, d.id)}
                label={d.term}
                confirmText={`Delete definition "${d.term}"?`}
                className="shrink-0 rounded text-ggrey hover:bg-ghover"
              />
            </li>
          ))}
          {definitions.length === 0 && <li className="py-2.5 text-sm text-ggrey">No definitions yet.</li>}
        </ul>
        <form action={upsertDefinitionAction} className="flex flex-col gap-3 sm:flex-row">
          <Input name="term" placeholder="Term" className="sm:w-48" />
          <Input name="definition" placeholder="Definition" className="flex-1" />
          <Button type="submit">Save</Button>
        </form>
      </Card>
    </div>
  );
}
