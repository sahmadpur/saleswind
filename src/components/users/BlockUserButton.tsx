"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { FormState } from "@/lib/action-state";

export function BlockUserButton({ action, name, blocked }: {
  action: (prev: unknown, fd: FormData) => Promise<FormState>; name: string; blocked: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  const verb = blocked ? "Unblock" : "Block";
  return (
    <form
      action={formAction}
      className="inline-flex items-center justify-end gap-2"
      onSubmit={(e) => {
        const msg = blocked ? `Unblock ${name}? They will be able to sign in again.` : `Block ${name}? They will be signed out and unable to sign in.`;
        if (!confirm(msg)) e.preventDefault();
      }}
    >
      {state.error?._form && <span className="text-xs text-gred">{state.error._form[0]}</span>}
      <Button
        type="submit"
        variant="ghost"
        className={blocked ? "h-8 px-3 text-ggreen hover:bg-ggreen-50" : "h-8 px-3 text-gyellow-dark hover:bg-gyellow-50"}
        disabled={pending}
        aria-label={`${verb} ${name}`}
        title={verb}
      >
        <Icon name={blocked ? "lock_open" : "block"} />
      </Button>
    </form>
  );
}
