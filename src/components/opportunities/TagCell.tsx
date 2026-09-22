"use client";
import { useState, useTransition } from "react";
import { Chip } from "@/components/ui/Chip";
import { Popover } from "@/components/ui/Popover";
import { attachTagAction, detachTagAction } from "@/actions/opportunity-actions";
import { MAX_TAGS, MIN_TAGS } from "@/schemas/opportunity";
import { cn } from "@/lib/cn";

type Tag = { value: string; label: string };

const WIDTH = 224;

/** Tags cell with a checkbox popover. Each toggle saves immediately, within the 1–3 tag rule. */
export function TagCell({ opportunityId, attached, options }: {
  opportunityId: string;
  attached: { id: string; label: string }[];
  options: Tag[];
}) {
  const [selected, setSelected] = useState(() => new Set(attached.map((t) => t.id)));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Resync with server data when a save revalidates the page, without closing the popover.
  const attachedKey = attached.map((t) => t.id).join(",");
  const [syncedKey, setSyncedKey] = useState(attachedKey);
  if (attachedKey !== syncedKey) {
    setSyncedKey(attachedKey);
    setSelected(new Set(attached.map((t) => t.id)));
  }

  function toggle(tagId: string) {
    const on = !selected.has(tagId);
    const next = new Set(selected);
    if (on) next.add(tagId); else next.delete(tagId);
    setSelected(next);
    setError(null);
    start(async () => {
      const res = await (on ? attachTagAction : detachTagAction)(opportunityId, tagId);
      if (res.error) {
        setError(res.error);
        setSelected((s) => {
          const back = new Set(s);
          if (on) back.delete(tagId); else back.add(tagId);
          return back;
        });
      }
    });
  }

  // Inactive tags stay visible (and removable) while attached.
  const known = new Map(options.map((o) => [o.value, o.label]));
  for (const t of attached) if (!known.has(t.id)) known.set(t.id, t.label);
  const shown = [...known].filter(([id]) => selected.has(id));
  const atMax = selected.size >= MAX_TAGS;
  const atMin = selected.size <= MIN_TAGS;

  return (
    <Popover
      label="Tags"
      triggerTitle="Edit tags"
      width={WIDTH}
      onOpen={() => setError(null)}
      panelClassName={cn(pending && "opacity-80")}
      triggerClassName={(open) => cn(
        "group/cell relative -mx-1 flex min-h-6 w-[calc(100%+0.5rem)] min-w-0 flex-wrap items-center gap-1 rounded px-1 py-0.5 text-left transition-colors hover:bg-gsurface hover:ring-1 hover:ring-gline",
        open && "bg-gsurface ring-1 ring-gblue",
      )}
      trigger={() => (
        <>
          {shown.length === 0 && <span className="text-ggrey-2">—</span>}
          {shown.map(([id, label]) => <Chip key={id} label={label} className="max-w-28" />)}
          <span
            className="material-symbols-outlined pointer-events-none absolute right-0.5 top-1/2 -translate-y-1/2 rounded bg-gsurface px-0.5 text-ggrey-2 opacity-0 group-hover/cell:opacity-100"
            style={{ fontSize: 13 }}
          >
            edit
          </span>
        </>
      )}
    >
      {known.size === 0 && <p className="px-3 py-2 text-xs text-ggrey">No tags for this stage</p>}
      <ul className="max-h-64 overflow-y-auto">
        {[...known].map(([id, label]) => {
          const on = selected.has(id);
          const locked = on ? atMin : atMax;
          return (
            <li key={id}>
              <label
                title={locked ? (on ? `At least ${MIN_TAGS} tag required` : `At most ${MAX_TAGS} tags`) : undefined}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-[13px] text-gink",
                  locked ? "cursor-not-allowed text-ggrey-2" : "cursor-pointer hover:bg-ghover",
                )}
              >
                <input type="checkbox" checked={on} disabled={locked} onChange={() => toggle(id)} className="accent-gblue" />
                <span className="truncate">{label}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-gline-2 px-3 py-1.5 text-[11px] text-ggrey">{selected.size}/{MAX_TAGS} tags</p>
      {error && <p role="alert" className="border-t border-gline-2 px-3 py-1.5 text-[11px] font-medium text-gred">{error}</p>}
    </Popover>
  );
}
