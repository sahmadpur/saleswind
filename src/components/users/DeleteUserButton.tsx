"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { FormState } from "@/lib/action-state";

export function DeleteUserButton({ action, name }: { action: (prev: unknown, fd: FormData) => Promise<FormState>; name: string }) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  return (
    <form
      action={formAction}
      className="inline-flex items-center justify-end gap-2"
      onSubmit={(e) => { if (!confirm(`Delete ${name}?`)) e.preventDefault(); }}
    >
      {state.error?._form && <span className="text-xs text-gred">{state.error._form[0]}</span>}
      <Button type="submit" variant="ghost" className="h-8 px-3 text-gred hover:bg-gred/10" disabled={pending} aria-label={`Delete ${name}`}>
        <Icon name="delete" />
      </Button>
    </form>
  );
}
