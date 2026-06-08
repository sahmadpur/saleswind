"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { transitionAction } from "@/actions/opportunity-actions";
import type { TransitionKind } from "@/services/opportunity-service";

export function TransitionControls({ id, canAdvance, canBack, cancelled }: {
  id: string; canAdvance: boolean; canBack: boolean; cancelled: boolean;
}) {
  const [busy, setBusy] = useState(false);
  if (cancelled) return <p className="text-sm text-neutral-500">This opportunity is cancelled.</p>;

  async function run(kind: TransitionKind, needsReason: boolean) {
    let reason: string | undefined;
    if (needsReason) {
      reason = window.prompt(`Reason to ${kind}?`) ?? undefined;
      if (!reason) return;
    }
    setBusy(true);
    await transitionAction(id, kind, reason);
    setBusy(false);
  }

  return (
    <div className="flex gap-2">
      {canAdvance && <Button disabled={busy} onClick={() => run("advance", false)}>Advance</Button>}
      {canBack && <Button variant="ghost" disabled={busy} onClick={() => run("back", true)}>Move back</Button>}
      <Button variant="danger" disabled={busy} onClick={() => run("cancel", true)}>Cancel</Button>
    </div>
  );
}
