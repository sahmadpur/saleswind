"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { transitionAction } from "@/actions/opportunity-actions";
import type { TransitionKind } from "@/services/opportunity-service";

export function TransitionControls({ id, canAdvance, canBack }: { id: string; canAdvance: boolean; canBack: boolean }) {
  const [busy, setBusy] = useState(false);

  async function run(kind: TransitionKind) {
    setBusy(true);
    await transitionAction(id, kind);
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canAdvance && (
        <Button disabled={busy} onClick={() => run("advance")}>
          <Icon name="arrow_forward" />
          Advance
        </Button>
      )}
      {canBack && (
        <Button variant="outline" disabled={busy} onClick={() => run("back")}>
          <Icon name="arrow_back" />
          Move back
        </Button>
      )}
    </div>
  );
}
