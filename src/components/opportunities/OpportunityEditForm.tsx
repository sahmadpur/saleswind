"use client";
import { useActionState, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { grossProfit } from "@/lib/domain/finance";
import { money } from "@/lib/format";

type Option = { id: string; label: string };

export function OpportunityEditForm({ action, defaults, statuses, users }: {
  action: (prev: unknown, fd: FormData) => Promise<{ ok?: boolean; error?: unknown }>;
  defaults: { title: string; description: string; ownerId: string; statusId: string; revenue: number; marginPct: number; meetingAt: string };
  statuses: Option[]; users: Option[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [revenue, setRevenue] = useState(defaults.revenue);
  const [margin, setMargin] = useState(defaults.marginPct);
  return (
    <form action={formAction} className="space-y-3">
      <Input name="title" defaultValue={defaults.title} required />
      <Input name="description" defaultValue={defaults.description} />
      <Select name="statusId" defaultValue={defaults.statusId}>
        <option value="">No status</option>
        {statuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </Select>
      <Select name="ownerId" defaultValue={defaults.ownerId}>
        {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
      </Select>
      <div className="flex gap-3">
        <Input name="revenue" type="number" step="0.01" defaultValue={defaults.revenue} onChange={(e) => setRevenue(Number(e.target.value))} />
        <Input name="marginPct" type="number" step="0.01" defaultValue={defaults.marginPct} onChange={(e) => setMargin(Number(e.target.value))} />
      </div>
      <p className="text-sm text-neutral-500">Gross profit: <span className="font-medium text-neutral-900">{money(grossProfit(revenue, margin))}</span></p>
      <Input name="meetingAt" type="datetime-local" defaultValue={defaults.meetingAt} />
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
      {state?.ok ? <span className="ml-3 text-sm text-emerald-600">Saved</span> : null}
    </form>
  );
}
