"use client";
import { useActionState, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import { grossProfit } from "@/lib/domain/finance";
import { money } from "@/lib/format";
import type { FormState } from "@/lib/action-state";

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
  action: (prev: unknown, fd: FormData) => Promise<FormState>;
  accounts: Option[]; users: Option[];
}) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  const [revenue, setRevenue] = useState(0);
  const [margin, setMargin] = useState(0);
  return (
    <form action={formAction} className="space-y-5">
      <Labeled label="Account">
        <Select name="accountId" required defaultValue={state.values?.accountId ?? ""}>
          <option value="" disabled>Select account…</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </Select>
        <FieldError errors={state.error?.accountId} />
      </Labeled>
      <Labeled label="Title">
        <Input name="title" placeholder="e.g. 5 XWZ Printers" required defaultValue={state.values?.title} />
        <FieldError errors={state.error?.title} />
      </Labeled>
      <Labeled label="Description">
        <Input name="description" placeholder="Short summary" defaultValue={state.values?.description} />
      </Labeled>
      <Labeled label="Accountable">
        <Select name="accountableId" required defaultValue={state.values?.accountableId ?? ""}>
          <option value="" disabled>Assign accountable…</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
        </Select>
        <FieldError errors={state.error?.accountableId} />
      </Labeled>
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Predicted revenue">
          <Input name="revenue" type="number" step="0.01" placeholder="0.00" required defaultValue={state.values?.revenue} onChange={(e) => setRevenue(Number(e.target.value))} />
          <FieldError errors={state.error?.revenue} />
        </Labeled>
        <Labeled label="Margin %">
          <Input name="marginPct" type="number" step="0.01" placeholder="0" required defaultValue={state.values?.marginPct} onChange={(e) => setMargin(Number(e.target.value))} />
          <FieldError errors={state.error?.marginPct} />
        </Labeled>
      </div>
      <div className="flex items-center justify-between rounded-xl bg-ggreen-50 px-4 py-2.5">
        <span className="text-sm text-gink-2">Predicted gross profit</span>
        <span className="text-base font-medium tabular-nums text-ggreen">{money(grossProfit(revenue, margin))}</span>
      </div>
      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create opportunity"}</Button>
        {state.error ? (
          <p className="text-sm text-gred">{state.error._form?.[0] ?? "Please fix the errors above."}</p>
        ) : null}
      </div>
    </form>
  );
}
