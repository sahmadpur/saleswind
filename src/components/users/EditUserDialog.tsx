"use client";
import { useActionState, useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Icon } from "@/components/ui/Icon";
import { FieldError } from "@/components/ui/FieldError";
import type { FormState } from "@/lib/action-state";

type User = { name: string; email: string; role: string };

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ggrey">{label}</span>
      {children}
    </label>
  );
}

function EditForm({ action, user, isSelf, onDone }: {
  action: (prev: unknown, fd: FormData) => Promise<FormState>; user: User; isSelf: boolean; onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  useEffect(() => { if (state.ok) onDone(); }, [state, onDone]);
  return (
    <form action={formAction} className="space-y-4">
      <h2 className="text-lg font-semibold text-gink">Edit user</h2>
      <Labeled label="Name">
        <Input name="name" defaultValue={user.name} required />
        <FieldError errors={state.error?.name} />
      </Labeled>
      <Labeled label="Email">
        <Input name="email" type="email" defaultValue={user.email} required />
        <FieldError errors={state.error?.email} />
      </Labeled>
      <Labeled label="Role">
        {/* Disabled selects don't submit, so mirror the value in a hidden input. */}
        {isSelf && <input type="hidden" name="role" value={user.role} />}
        <Select name={isSelf ? undefined : "role"} defaultValue={user.role} disabled={isSelf}>
          <option value="AGENT">Agent</option>
          <option value="MANAGER">Manager</option>
          <option value="ADMIN">Admin</option>
        </Select>
        {isSelf && <p className="mt-1 text-xs text-ggrey">You can&apos;t change your own role.</p>}
        <FieldError errors={state.error?.role} />
      </Labeled>
      <Labeled label="New password">
        <Input name="password" type="password" placeholder="Leave blank to keep current" autoComplete="new-password" />
        <FieldError errors={state.error?.password} />
      </Labeled>
      {state.error?._form && <p className="text-sm text-gred">{state.error._form[0]}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
      </div>
    </form>
  );
}

export function EditUserDialog({ action, user, isSelf }: { action: (prev: unknown, fd: FormData) => Promise<FormState>; user: User; isSelf: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="ghost" className="h-8 px-3" onClick={() => setOpen(true)} aria-label={`Edit ${user.name}`}>
        <Icon name="edit" />
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        {/* Remounts on each open so the form starts from the saved values. */}
        {open && <EditForm action={action} user={user} isSelf={isSelf} onDone={() => setOpen(false)} />}
      </Dialog>
    </>
  );
}
