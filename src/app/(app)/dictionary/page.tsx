import { requireRole } from "@/lib/session";
import { listVocabularies } from "@/services/dictionary-service";
import { addStatusAction, toggleStatusAction, addTagAction, toggleTagAction, upsertDefinitionAction } from "@/actions/dictionary-actions";
import { Card, CardLabel } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";

const STATES = ["PROSPECT", "SALES", "CONTRACT", "PROJECT"] as const;

const STATE_DOT: Record<string, string> = {
  PROSPECT: "bg-gyellow",
  SALES: "bg-gblue",
  CONTRACT: "bg-gviolet",
  PROJECT: "bg-ggreen",
};

function StateLabel({ state }: { state: string }) {
  return (
    <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ggrey">
      <span className={`h-1.5 w-1.5 rounded-full ${STATE_DOT[state]}`} />
      {state}
    </div>
  );
}

export default async function DictionaryPage() {
  await requireRole("dictionary:manage");
  const { statuses, tags, definitions } = await listVocabularies();
  return (
    <div className="space-y-8">
      <PageHeader title="Dictionary" subtitle="Manage the vocabulary used across the pipeline" />

      <Card>
        <CardLabel>Statuses</CardLabel>
        <div className="grid gap-6 sm:grid-cols-2">
          {STATES.map((s) => (
            <div key={s}>
              <StateLabel state={s} />
              <div className="flex flex-wrap items-center gap-2">
                {statuses.filter((x) => x.state === s).map((x) => (
                  <form key={x.id} action={toggleStatusAction.bind(null, x.id)}>
                    <button
                      type="submit"
                      className={`g-press inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        x.isActive
                          ? "bg-gblue-100 text-gblue-dark hover:bg-gblue-200"
                          : "bg-ghover text-ggrey-2 line-through hover:bg-gline-2"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${x.isActive ? "bg-gblue" : "bg-ggrey-2"}`} />
                      {x.label}
                    </button>
                  </form>
                ))}
                <form action={addStatusAction} className="flex items-center gap-1.5">
                  <input type="hidden" name="state" value={s} />
                  <input
                    name="label"
                    placeholder="New status"
                    className="h-8 w-32 rounded-full border border-gline bg-gsurface px-3 text-xs outline-none transition-colors hover:border-ggrey-2 focus:border-gblue focus:ring-1 focus:ring-gblue"
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
          {STATES.map((s) => (
            <div key={s}>
              <StateLabel state={s} />
              <div className="flex flex-wrap items-center gap-2">
                {tags.filter((x) => x.state === s).map((x) => (
                  <form key={x.id} action={toggleTagAction.bind(null, x.id)}>
                    <button
                      type="submit"
                      className={`g-press inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        x.isActive
                          ? "border-gline bg-gsurface text-gink-2 hover:bg-ghover"
                          : "border-transparent bg-ghover text-ggrey-2 line-through"
                      }`}
                    >
                      {x.label}
                    </button>
                  </form>
                ))}
                <form action={addTagAction} className="flex items-center gap-1.5">
                  <input type="hidden" name="state" value={s} />
                  <input
                    name="label"
                    placeholder="New tag"
                    className="h-8 w-32 rounded-full border border-gline bg-gsurface px-3 text-xs outline-none transition-colors hover:border-ggrey-2 focus:border-gblue focus:ring-1 focus:ring-gblue"
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
            <li key={d.id} className="py-2.5 text-sm">
              <span className="font-medium text-gink">{d.term}</span>
              <span className="text-ggrey"> — {d.definition}</span>
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
