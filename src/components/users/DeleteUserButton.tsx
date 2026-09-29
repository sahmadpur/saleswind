"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { FormState } from "@/lib/action-state";
import type { UserCounts } from "@/components/users/UserTable";

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Spells out what deleting this user does to their work, so the confirm is honest. */
export function deleteUserPrompt(name: string, c: UserCounts) {
  const moved: string[] = [];
  if (c.opportunities) moved.push(count(c.opportunities, "opportunity", "opportunities"));
  if (c.tasks) moved.push(count(c.tasks, "task", "tasks"));
  const parts: string[] = [];
  if (moved.length) parts.push(`${moved.join(" and ")} will be reassigned to you`);
  if (c.comments) parts.push(`${count(c.comments, "comment", "comments")} will be deleted`);
  return parts.length ? `Delete ${name}? ${parts.join("; ")}.` : `Delete ${name}?`;
}

export function DeleteUserButton({ action, name, counts }: {
  action: (prev: unknown, fd: FormData) => Promise<FormState>; name: string; counts: UserCounts;
}) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  return (
    <form
      action={formAction}
      className="inline-flex items-center justify-end gap-2"
      onSubmit={(e) => { if (!confirm(deleteUserPrompt(name, counts))) e.preventDefault(); }}
    >
      {state.error?._form && <span className="text-xs text-gred">{state.error._form[0]}</span>}
      <Button type="submit" variant="ghost" className="h-8 px-3 text-gred hover:bg-gred/10" disabled={pending} aria-label={`Delete ${name}`}>
        <Icon name="delete" />
      </Button>
    </form>
  );
}
