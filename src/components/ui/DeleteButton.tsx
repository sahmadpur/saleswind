"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

/** Outline delete button with a confirm prompt; shows the action's error inline when it refuses. */
export function DeleteButton({ action, name, prompt }: {
  action: () => Promise<{ error?: string } | void>; name: string;
  /** Overrides the default "Delete {name}?" confirm text. */
  prompt?: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        className="text-gred"
        disabled={pending}
        onClick={() => {
          if (!confirm(prompt ?? `Delete ${name}?`)) return;
          start(async () => { const r = await action(); setError(r?.error ?? null); });
        }}
      >
        <Icon name="delete" />
        Delete
      </Button>
      {error && <span role="alert" className="text-xs text-gred">{error}</span>}
    </span>
  );
}
