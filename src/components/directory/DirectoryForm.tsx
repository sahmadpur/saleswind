"use client";
import { useActionState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import type { FormState } from "@/lib/action-state";

type Values = { name?: string; contactName?: string; email?: string; phone?: string; website?: string; notes?: string };

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ggrey">{label}</span>
      {children}
    </label>
  );
}

export function DirectoryForm({ action, defaults = {}, contactLabel, namePlaceholder, submitLabel }: {
  action: (prev: unknown, fd: FormData) => Promise<FormState>;
  defaults?: Values; contactLabel: string; namePlaceholder: string; submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  const v = (k: keyof Values) => state.values?.[k] ?? defaults[k] ?? "";
  return (
    <form action={formAction} className="space-y-4">
      <Labeled label="Name">
        <Input name="name" placeholder={namePlaceholder} required defaultValue={v("name")} />
        <FieldError errors={state.error?.name} />
      </Labeled>
      <Labeled label={contactLabel}>
        <Input name="contactName" defaultValue={v("contactName")} />
      </Labeled>
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Email">
          <Input name="email" type="email" placeholder="name@company.com" defaultValue={v("email")} />
          <FieldError errors={state.error?.email} />
        </Labeled>
        <Labeled label="Phone">
          <Input name="phone" placeholder="+994 50 000 00 00" defaultValue={v("phone")} />
        </Labeled>
      </div>
      <Labeled label="Website">
        <Input name="website" placeholder="company.com" defaultValue={v("website")} />
        <FieldError errors={state.error?.website} />
      </Labeled>
      <Labeled label="Notes">
        <Textarea name="notes" rows={5} defaultValue={v("notes")} />
      </Labeled>
      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : submitLabel}</Button>
        {state.error ? (
          <p className="text-sm text-gred">Please fix the errors above.</p>
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
