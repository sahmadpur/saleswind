"use client";
import { useActionState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import type { FormState } from "@/lib/action-state";

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ggrey">{label}</span>
      {children}
    </label>
  );
}

export function AccountForm({ action }: { action: (prev: unknown, fd: FormData) => Promise<FormState>; }) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  return (
    <form action={formAction} className="space-y-4">
      <Labeled label="Account name">
        <Input name="name" placeholder="Acme Inc." required defaultValue={state.values?.name} />
        <FieldError errors={state.error?.name} />
      </Labeled>
      <Labeled label="Industry">
        <Input name="industry" placeholder="Manufacturing" defaultValue={state.values?.industry} />
      </Labeled>
      <Labeled label="Website">
        <Input name="website" placeholder="acme.com" defaultValue={state.values?.website} />
        <FieldError errors={state.error?.website} />
      </Labeled>
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Contact name">
          <Input name="primaryContactName" placeholder="Jane Doe" defaultValue={state.values?.primaryContactName} />
        </Labeled>
        <Labeled label="Contact email">
          <Input name="primaryContactEmail" type="email" placeholder="jane@acme.com" defaultValue={state.values?.primaryContactEmail} />
          <FieldError errors={state.error?.primaryContactEmail} />
        </Labeled>
      </div>
      <Labeled label="Contact phone">
        <Input name="primaryContactPhone" placeholder="+1 555 0100" defaultValue={state.values?.primaryContactPhone} />
      </Labeled>
      <Labeled label="Notes">
        <Textarea name="notes" rows={8} placeholder="Background, key contacts, history — anything the team should know." defaultValue={state.values?.notes} />
      </Labeled>
      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save account"}</Button>
        {state.error ? <p className="text-sm text-gred">Please fix the errors above.</p> : null}
      </div>
    </form>
  );
}
