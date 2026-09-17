"use client";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Markdown } from "@/components/content/Markdown";
import { cn } from "@/lib/cn";
import type { FormState } from "@/lib/action-state";

export function InstructionsEditor({ action, body, onClose }: {
  action: (prev: unknown, fd: FormData) => Promise<FormState>; body: string; onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(async (prev: unknown, fd: FormData) => {
    const res = await action(prev, fd);
    if (res.ok) onClose();
    return res;
  }, {} as FormState);
  const [draft, setDraft] = useState(body);
  const [tab, setTab] = useState<"write" | "preview">("write");

  const tabCls = (t: typeof tab) =>
    cn("h-8 rounded-md px-3 text-sm font-medium", tab === t ? "bg-gink text-white" : "text-ggrey hover:bg-ghover hover:text-gink");

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          <button type="button" className={tabCls("write")} onClick={() => setTab("write")}>Write</button>
          <button type="button" className={tabCls("preview")} onClick={() => setTab("preview")}>Preview</button>
        </div>
        <p className="text-xs text-ggrey">Markdown: # Heading, **bold**, - list, [link](https://…), | tables |</p>
      </div>
      <input type="hidden" name="body" value={draft} />
      {tab === "write" ? (
        <Textarea rows={24} value={draft} onChange={(e) => setDraft(e.target.value)} className="font-mono text-[13px]" aria-label="Instructions (Markdown)" />
      ) : (
        <div className="min-h-64 rounded-md border border-gline-2 p-5">{draft.trim() ? <Markdown>{draft}</Markdown> : <p className="text-sm text-ggrey">Nothing to preview.</p>}</div>
      )}
      <div className="flex items-center justify-end gap-2">
        {state.error && <p className="mr-auto text-sm text-gred">Could not save.</p>}
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
      </div>
    </form>
  );
}
