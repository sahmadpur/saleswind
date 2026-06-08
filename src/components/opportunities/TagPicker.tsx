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
      <div className="flex min-h-8 flex-wrap gap-2">
        {attached.length === 0 && <span className="text-sm text-ggrey">No tags yet</span>}
        {attached.map((t) => <Chip key={t.id} label={t.label} onRemove={() => detachTagAction(opportunityId, t.id)} />)}
      </div>
      {available.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-gline-2 pt-4">
          {available.map((t) => (
            <button
              key={t.id}
              onClick={() => attachTagAction(opportunityId, t.id)}
              className="g-press inline-flex items-center gap-1 rounded-full border border-dashed border-gline px-3 py-1 text-xs font-medium text-ggrey transition-colors hover:border-gblue hover:bg-gblue-50 hover:text-gblue"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
