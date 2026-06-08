"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { transitionAction } from "@/actions/opportunity-actions";
import type { TransitionKind } from "@/services/opportunity-service";

export function TransitionControls({ id, canAdvance, canBack, cancelled }: {
  id: string; canAdvance: boolean; canBack: boolean; cancelled: boolean;
}) {
  const [busy, setBusy] = useState(false);
  if (cancelled)
    return (
      <p className="flex items-center gap-2 text-sm text-ggrey">
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>block</span>
        This opportunity is cancelled.
      </p>
    );

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
    <div className="flex flex-wrap gap-2">
      {canAdvance && (
        <Button disabled={busy} onClick={() => run("advance", false)}>
          <Icon name="arrow_forward" />
          Advance
        </Button>
      )}
      {canBack && (
        <Button variant="outline" disabled={busy} onClick={() => run("back", true)}>
          <Icon name="arrow_back" />
          Move back
        </Button>
      )}
      <Button variant="ghost" disabled={busy} onClick={() => run("cancel", true)} className="text-gred hover:bg-gred-50">
        <Icon name="cancel" />
        Cancel
      </Button>
    </div>
  );
}
