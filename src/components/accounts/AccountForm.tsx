"use client";
import { useActionState, useEffect } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import type { FormState } from "@/lib/action-state";
import { useCloseDialog } from "@/components/ui/EditDialogButton";

type Values = {
  name?: string; industry?: string; website?: string; primaryContactName?: string; primaryContactEmail?: string; primaryContactPhone?: string; notes?: string;
};

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ggrey">{label}</span>
      {children}
    </label>
  );
}

export function AccountForm({ action, defaults = {}, submitLabel = "Save account" }: {
  action: (prev: unknown, fd: FormData) => Promise<FormState>; defaults?: Values; submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  const close = useCloseDialog();
  useEffect(() => { if (state.ok) close(); }, [state, close]);
  const v = (k: keyof Values) => state.values?.[k] ?? defaults[k] ?? "";
  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Account name">
          <Input name="name" placeholder="Acme Inc." required defaultValue={v("name")} />
          <FieldError errors={state.error?.name} />
        </Labeled>
        <Labeled label="Industry">
          <Input name="industry" placeholder="Manufacturing" defaultValue={v("industry")} />
        </Labeled>
        <Labeled label="Website">
          <Input name="website" placeholder="acme.com" defaultValue={v("website")} />
          <FieldError errors={state.error?.website} />
        </Labeled>
        <Labeled label="Contact name">
          <Input name="primaryContactName" placeholder="Jane Doe" defaultValue={v("primaryContactName")} />
        </Labeled>
        <Labeled label="Contact email">
          <Input name="primaryContactEmail" type="email" placeholder="jane@acme.com" defaultValue={v("primaryContactEmail")} />
          <FieldError errors={state.error?.primaryContactEmail} />
        </Labeled>
        <Labeled label="Contact phone">
          <Input name="primaryContactPhone" placeholder="+1 555 0100" defaultValue={v("primaryContactPhone")} />
        </Labeled>
      </div>
      <Labeled label="Notes">
        <Textarea name="notes" rows={5} placeholder="Background, key contacts, history — anything the team should know." defaultValue={v("notes")} />
      </Labeled>
      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : submitLabel}</Button>
        {state.error ? <p className="text-sm text-gred">Please fix the errors above.</p> : null}
      </div>
    </form>
  );
}
