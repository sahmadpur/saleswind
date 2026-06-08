"use client";
import { useActionState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function AccountForm({ action }: { action: (prev: unknown, fd: FormData) => Promise<{ error?: unknown }>; }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-3 max-w-lg">
      <Input name="name" placeholder="Account name" required />
      <Input name="industry" placeholder="Industry" />
      <Input name="website" placeholder="Website (https://...)" />
      <Input name="primaryContactName" placeholder="Contact name" />
      <Input name="primaryContactEmail" placeholder="Contact email" />
      <Input name="primaryContactPhone" placeholder="Contact phone" />
      <Input name="notes" placeholder="Notes" />
      <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save account"}</Button>
      {state?.error ? <p className="text-sm text-red-600">Please check the form.</p> : null}
    </form>
  );
}
