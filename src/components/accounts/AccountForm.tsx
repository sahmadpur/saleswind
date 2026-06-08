"use client";
import { useActionState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ggrey">{label}</span>
      {children}
    </label>
  );
}

export function AccountForm({ action }: { action: (prev: unknown, fd: FormData) => Promise<{ error?: unknown }>; }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-4">
      <Labeled label="Account name"><Input name="name" placeholder="Acme Inc." required /></Labeled>
      <Labeled label="Industry"><Input name="industry" placeholder="Manufacturing" /></Labeled>
      <Labeled label="Website"><Input name="website" placeholder="https://acme.com" /></Labeled>
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Contact name"><Input name="primaryContactName" placeholder="Jane Doe" /></Labeled>
        <Labeled label="Contact email"><Input name="primaryContactEmail" type="email" placeholder="jane@acme.com" /></Labeled>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Contact phone"><Input name="primaryContactPhone" placeholder="+1 555 0100" /></Labeled>
        <Labeled label="Notes"><Input name="notes" placeholder="Optional" /></Labeled>
      </div>
      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save account"}</Button>
        {state?.error ? <p className="text-sm text-gred">Please check the form.</p> : null}
      </div>
    </form>
  );
}
