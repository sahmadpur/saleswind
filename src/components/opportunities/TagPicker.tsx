"use client";
import { useState, useTransition } from "react";
import { Chip } from "@/components/ui/Chip";
import { attachTagAction, detachTagAction } from "@/actions/opportunity-actions";
import { MAX_TAGS, MIN_TAGS } from "@/schemas/opportunity";

type Tag = { id: string; label: string };

/** Attached tags as removable chips, the rest as dashed "+" buttons, within the 1–3 tag rule. */
export function TagPicker({ opportunityId, allTags, attachedIds }: { opportunityId: string; allTags: Tag[]; attachedIds: string[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const attachedSet = new Set(attachedIds);
  const attached = allTags.filter((t) => attachedSet.has(t.id));
  const available = allTags.filter((t) => !attachedSet.has(t.id));
  const atMax = attachedIds.length >= MAX_TAGS;
  const atMin = attachedIds.length <= MIN_TAGS;

  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (res.error) setError(res.error);
    });

  return (
    <div className={pending ? "space-y-4 opacity-80" : "space-y-4"}>
      <div className="flex min-h-8 flex-wrap items-center gap-2">
        {attached.length === 0 && <span className="text-sm text-ggrey">No tags yet</span>}
        {attached.map((t) => (
          <Chip
            key={t.id}
            label={t.label}
            onRemove={atMin ? undefined : () => run(() => detachTagAction(opportunityId, t.id))}
          />
        ))}
        <span className="ml-auto text-[11px] tabular-nums text-ggrey">{attachedIds.length}/{MAX_TAGS}</span>
      </div>
      {available.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-gline-2 pt-4">
          {available.map((t) => (
            <button
              key={t.id}
              disabled={atMax}
              title={atMax ? `At most ${MAX_TAGS} tags` : undefined}
              onClick={() => run(() => attachTagAction(opportunityId, t.id))}
              className="g-press inline-flex items-center gap-1 rounded-md border border-dashed border-gline px-2.5 py-1 text-xs font-medium text-ggrey transition-colors hover:border-gblue hover:bg-gblue-50 hover:text-gblue disabled:cursor-not-allowed disabled:border-gline-2 disabled:text-ggrey-2 disabled:hover:bg-transparent"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
              {t.label}
            </button>
          ))}
        </div>
      )}
      {error && <p role="alert" className="text-xs font-medium text-gred">{error}</p>}
    </div>
  );
}
