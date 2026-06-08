"use client";
import { useActionState, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { grossProfit } from "@/lib/domain/finance";
import { money } from "@/lib/format";

type Option = { id: string; label: string };

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ggrey">{label}</span>
      {children}
    </label>
  );
}

export function OpportunityCreateForm({ action, accounts, users }: {
  action: (prev: unknown, fd: FormData) => Promise<{ error?: unknown }>;
  accounts: Option[]; users: Option[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [revenue, setRevenue] = useState(0);
  const [margin, setMargin] = useState(0);
  return (
    <form action={formAction} className="space-y-5">
      <Labeled label="Account">
        <Select name="accountId" required defaultValue="">
          <option value="" disabled>Select account…</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </Select>
      </Labeled>
      <Labeled label="Title"><Input name="title" placeholder="e.g. 5 XWZ Printers" required /></Labeled>
      <Labeled label="Description"><Input name="description" placeholder="Short summary" /></Labeled>
      <Labeled label="Owner">
        <Select name="ownerId" required defaultValue="">
          <option value="" disabled>Assign owner…</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
        </Select>
      </Labeled>
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Revenue">
          <Input name="revenue" type="number" step="0.01" placeholder="0.00" required onChange={(e) => setRevenue(Number(e.target.value))} />
        </Labeled>
        <Labeled label="Margin %">
          <Input name="marginPct" type="number" step="0.01" placeholder="0" required onChange={(e) => setMargin(Number(e.target.value))} />
        </Labeled>
      </div>
      <div className="flex items-center justify-between rounded-xl bg-ggreen-50 px-4 py-2.5">
        <span className="text-sm text-gink-2">Gross profit</span>
        <span className="text-base font-medium tabular-nums text-ggreen">{money(grossProfit(revenue, margin))}</span>
      </div>
      <Labeled label="Meeting"><Input name="meetingAt" type="datetime-local" /></Labeled>
      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create opportunity"}</Button>
        {state?.error ? <p className="text-sm text-gred">Please check the form.</p> : null}
      </div>
    </form>
  );
}
