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

export function OpportunityEditForm({ action, defaults, statuses, users }: {
  action: (prev: unknown, fd: FormData) => Promise<FormState>;
  defaults: { title: string; description: string; accountableId: string; statusId: string; revenue: number; marginPct: number };
  statuses: Option[]; users: Option[];
}) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  const [revenue, setRevenue] = useState(defaults.revenue);
  const [margin, setMargin] = useState(defaults.marginPct);
  return (
    <form action={formAction} className="space-y-5">
      <div className="flex items-center justify-end gap-3">
        {state.error ? (
          <p className="text-sm text-gred">{state.error._form?.[0] ?? "Please fix the errors above."}</p>
        ) : state.ok ? (
          <span className="inline-flex items-center gap-1 text-sm text-ggreen">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
            Saved
          </span>
        ) : null}
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
      </div>
      <Labeled label="Title">
        <Input name="title" defaultValue={state.values?.title ?? defaults.title} required />
        <FieldError errors={state.error?.title} />
      </Labeled>
      <Labeled label="Description">
        <Input name="description" defaultValue={state.values?.description ?? defaults.description} />
      </Labeled>
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Status">
          <Select name="statusId" defaultValue={state.values?.statusId ?? defaults.statusId}>
            <option value="">No status</option>
            {statuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </Select>
        </Labeled>
        <Labeled label="Accountable">
          <Select name="accountableId" defaultValue={state.values?.accountableId ?? defaults.accountableId}>
            {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </Select>
          <FieldError errors={state.error?.accountableId} />
        </Labeled>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="PR">
          <Input name="revenue" type="number" step="0.01" defaultValue={state.values?.revenue ?? defaults.revenue} onChange={(e) => setRevenue(Number(e.target.value))} />
          <FieldError errors={state.error?.revenue} />
        </Labeled>
        <Labeled label="MR %">
          <Input name="marginPct" type="number" step="0.01" defaultValue={state.values?.marginPct ?? defaults.marginPct} onChange={(e) => setMargin(Number(e.target.value))} />
          <FieldError errors={state.error?.marginPct} />
        </Labeled>
      </div>
      <div className="flex items-center justify-between rounded-md bg-ggreen-50 px-4 py-2.5">
        <span className="text-sm text-gink-2">PGP</span>
        <span className="text-base font-semibold tabular-nums text-ggreen">{money(grossProfit(revenue, margin))}</span>
      </div>
    </form>
  );
}
