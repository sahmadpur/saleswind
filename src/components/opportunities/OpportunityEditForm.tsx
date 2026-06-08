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

export function OpportunityEditForm({ action, defaults, statuses, users }: {
  action: (prev: unknown, fd: FormData) => Promise<{ ok?: boolean; error?: unknown }>;
  defaults: { title: string; description: string; ownerId: string; statusId: string; revenue: number; marginPct: number; meetingAt: string };
  statuses: Option[]; users: Option[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [revenue, setRevenue] = useState(defaults.revenue);
  const [margin, setMargin] = useState(defaults.marginPct);
  return (
    <form action={formAction} className="space-y-5">
      <Labeled label="Title"><Input name="title" defaultValue={defaults.title} required /></Labeled>
      <Labeled label="Description"><Input name="description" defaultValue={defaults.description} /></Labeled>
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Status">
          <Select name="statusId" defaultValue={defaults.statusId}>
            <option value="">No status</option>
            {statuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </Select>
        </Labeled>
        <Labeled label="Owner">
          <Select name="ownerId" defaultValue={defaults.ownerId}>
            {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </Select>
        </Labeled>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Revenue">
          <Input name="revenue" type="number" step="0.01" defaultValue={defaults.revenue} onChange={(e) => setRevenue(Number(e.target.value))} />
        </Labeled>
        <Labeled label="Margin %">
          <Input name="marginPct" type="number" step="0.01" defaultValue={defaults.marginPct} onChange={(e) => setMargin(Number(e.target.value))} />
        </Labeled>
      </div>
      <div className="flex items-center justify-between rounded-xl bg-ggreen-50 px-4 py-2.5">
        <span className="text-sm text-gink-2">Gross profit</span>
        <span className="text-base font-medium tabular-nums text-ggreen">{money(grossProfit(revenue, margin))}</span>
      </div>
      <Labeled label="Meeting"><Input name="meetingAt" type="datetime-local" defaultValue={defaults.meetingAt} /></Labeled>
      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
        {state?.ok ? (
          <span className="inline-flex items-center gap-1 text-sm text-ggreen">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
            Saved
          </span>
        ) : null}
      </div>
    </form>
  );
}
