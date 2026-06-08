"use client";
import { useActionState, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { grossProfit } from "@/lib/domain/finance";
import { money } from "@/lib/format";

type Option = { id: string; label: string };

export function OpportunityCreateForm({ action, accounts, users }: {
  action: (prev: unknown, fd: FormData) => Promise<{ error?: unknown }>;
  accounts: Option[]; users: Option[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [revenue, setRevenue] = useState(0);
  const [margin, setMargin] = useState(0);
  return (
    <form action={formAction} className="max-w-lg space-y-3">
      <Select name="accountId" required defaultValue="">
        <option value="" disabled>Select account…</option>
        {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
      </Select>
      <Input name="title" placeholder="Title (e.g. 5 XWZ Printers)" required />
      <Input name="description" placeholder="Description" />
      <Select name="ownerId" required defaultValue="">
        <option value="" disabled>Assign owner…</option>
        {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
      </Select>
      <div className="flex gap-3">
        <Input name="revenue" type="number" step="0.01" placeholder="Revenue" required onChange={(e) => setRevenue(Number(e.target.value))} />
        <Input name="marginPct" type="number" step="0.01" placeholder="Margin %" required onChange={(e) => setMargin(Number(e.target.value))} />
      </div>
      <p className="text-sm text-neutral-500">Gross profit: <span className="font-medium text-neutral-900">{money(grossProfit(revenue, margin))}</span></p>
      <Input name="meetingAt" type="datetime-local" />
      <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create opportunity"}</Button>
      {state?.error ? <p className="text-sm text-red-600">Please check the form.</p> : null}
    </form>
  );
}
