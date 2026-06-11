"use client";
import { useActionState } from "react";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import type { FormState } from "@/lib/action-state";

export function AccountNotesForm({ action, notes }: {
  action: (prev: unknown, fd: FormData) => Promise<FormState>;
  notes: string;
}) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  return (
    <form action={formAction} className="space-y-3">
      <Textarea
        name="notes"
        rows={8}
        placeholder="Background, key contacts, history — anything the team should know."
        defaultValue={state.values?.notes ?? notes}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save notes"}</Button>
        {state.error ? (
          <p className="text-sm text-gred">Could not save notes.</p>
        ) : state.ok ? (
          <span className="inline-flex items-center gap-1 text-sm text-ggreen">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
            Saved
          </span>
        ) : null}
      </div>
    </form>
  );
}
