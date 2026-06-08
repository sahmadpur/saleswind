import { requireRole } from "@/lib/session";
import { listVocabularies } from "@/services/dictionary-service";
import { addStatusAction, toggleStatusAction, addTagAction, toggleTagAction, upsertDefinitionAction } from "@/actions/dictionary-actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const STATES = ["PROSPECT", "SALES", "CONTRACT", "PROJECT"] as const;

export default async function DictionaryPage() {
  await requireRole("dictionary:manage");
  const { statuses, tags, definitions } = await listVocabularies();
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-medium">Dictionary</h1>

      <Card>
        <h2 className="mb-4 text-sm font-medium text-neutral-500">Statuses</h2>
        {STATES.map((s) => (
          <div key={s} className="mb-4">
            <div className="mb-2 text-xs font-medium uppercase text-neutral-400">{s}</div>
            <div className="flex flex-wrap gap-2">
              {statuses.filter((x) => x.state === s).map((x) => (
                <form key={x.id} action={toggleStatusAction.bind(null, x.id)}>
                  <button type="submit"
                    className={`rounded-full px-2.5 py-0.5 text-xs ${x.isActive ? "bg-blue-50 text-blue-700" : "bg-neutral-100 text-neutral-400 line-through"}`}>{x.label}</button>
                </form>
              ))}
            </div>
            <form action={addStatusAction} className="mt-2 flex gap-2">
              <input type="hidden" name="state" value={s} />
              <input name="label" placeholder="New status" className="rounded-lg border border-neutral-300 px-2 py-1 text-xs" />
              <Button type="submit" variant="ghost">Add</Button>
            </form>
          </div>
        ))}
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-medium text-neutral-500">Tags</h2>
        {STATES.map((s) => (
          <div key={s} className="mb-4">
            <div className="mb-2 text-xs font-medium uppercase text-neutral-400">{s}</div>
            <div className="flex flex-wrap gap-2">
              {tags.filter((x) => x.state === s).map((x) => (
                <form key={x.id} action={toggleTagAction.bind(null, x.id)}>
                  <button type="submit"
                    className={`rounded-full px-2.5 py-0.5 text-xs ${x.isActive ? "bg-neutral-100 text-neutral-700" : "bg-neutral-100 text-neutral-400 line-through"}`}>{x.label}</button>
                </form>
              ))}
            </div>
            <form action={addTagAction} className="mt-2 flex gap-2">
              <input type="hidden" name="state" value={s} />
              <input name="label" placeholder="New tag" className="rounded-lg border border-neutral-300 px-2 py-1 text-xs" />
              <Button type="submit" variant="ghost">Add</Button>
            </form>
          </div>
        ))}
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-medium text-neutral-500">Definitions</h2>
        <ul className="mb-4 space-y-2">
          {definitions.map((d) => (
            <li key={d.id} className="text-sm"><span className="font-medium">{d.term}:</span> {d.definition}</li>
          ))}
        </ul>
        <form action={upsertDefinitionAction} className="flex gap-2">
          <input name="term" placeholder="Term" className="rounded-lg border border-neutral-300 px-2 py-1 text-sm" />
          <input name="definition" placeholder="Definition" className="flex-1 rounded-lg border border-neutral-300 px-2 py-1 text-sm" />
          <Button type="submit">Save</Button>
        </form>
      </Card>
    </div>
  );
}
