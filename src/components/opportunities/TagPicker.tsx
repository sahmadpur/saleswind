"use client";
import { Chip } from "@/components/ui/Chip";
import { attachTagAction, detachTagAction } from "@/actions/opportunity-actions";

type Tag = { id: string; label: string };

export function TagPicker({ opportunityId, allTags, attachedIds }: { opportunityId: string; allTags: Tag[]; attachedIds: string[] }) {
  const attachedSet = new Set(attachedIds);
  const attached = allTags.filter((t) => attachedSet.has(t.id));
  const available = allTags.filter((t) => !attachedSet.has(t.id));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {attached.length === 0 && <span className="text-sm text-neutral-400">No tags yet</span>}
        {attached.map((t) => <Chip key={t.id} label={t.label} onRemove={() => detachTagAction(opportunityId, t.id)} />)}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
        {available.map((t) => (
          <button key={t.id} onClick={() => attachTagAction(opportunityId, t.id)}
            className="rounded-full border border-dashed border-neutral-300 px-2.5 py-0.5 text-xs text-neutral-600 hover:border-blue-400 hover:text-blue-600">
            + {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
