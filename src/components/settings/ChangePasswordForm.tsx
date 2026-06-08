"use client";
import { useActionState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type FieldErrors = Partial<Record<"currentPassword" | "newPassword" | "confirm", string[]>>;
type State = { error?: FieldErrors; ok?: boolean };

function Labeled({
  label,
  name,
  errors,
}: {
  label: string;
  name: "currentPassword" | "newPassword" | "confirm";
  errors?: FieldErrors;
}) {
  const msg = errors?.[name]?.[0];
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ggrey">{label}</span>
      <Input name={name} type="password" autoComplete="new-password" required />
      {msg ? <span className="mt-1 block text-xs text-gred">{msg}</span> : null}
    </label>
  );
}

export function ChangePasswordForm({
  action,
}: {
  action: (prev: unknown, fd: FormData) => Promise<State>;
}) {
  const [state, formAction, pending] = useActionState<State, FormData>(action, {});
  return (
    <form action={formAction} className="max-w-md space-y-4">
      <Labeled label="Current password" name="currentPassword" errors={state.error} />
      <Labeled label="New password" name="newPassword" errors={state.error} />
      <Labeled label="Confirm new password" name="confirm" errors={state.error} />
      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={pending}>
          {pending ? "Updating…" : "Update password"}
        </Button>
        {state.ok ? (
          <span className="flex items-center gap-1.5 text-sm text-ggreen">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
            Password updated
          </span>
        ) : null}
      </div>
    </form>
  );
}
