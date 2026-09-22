"use client";
import { useActionState, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import { grossProfit } from "@/lib/domain/finance";
import { money } from "@/lib/format";
import type { FormState } from "@/lib/action-state";
import { MAX_TAGS, MIN_TAGS } from "@/schemas/opportunity";

type Option = { id: string; label: string };
type StageOption = Option & { stage: string };

const STAGES = [["PROSPECT", "Prospect"], ["SALES", "Sales"], ["CONTRACT", "Contract"], ["PROJECT", "Project"]] as const;

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ggrey">{label}</span>
      {children}
    </label>
  );
}

export function OpportunityCreateForm({ action, accounts, users, statuses, tags }: {
  action: (prev: unknown, fd: FormData) => Promise<FormState>;
  accounts: Option[]; users: Option[]; statuses: StageOption[]; tags: StageOption[];
}) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  const [stage, setStage] = useState(state.values?.stage ?? "PROSPECT");
  const [statusId, setStatusId] = useState(state.values?.statusId ?? "");
  const [tagIds, setTagIds] = useState<string[]>(state.values?.tagIds ? state.values.tagIds.split(",") : []);
  const stageStatuses = statuses.filter((s) => s.stage === stage);
  const stageTags = tags.filter((t) => t.stage === stage);
  // Stage-scoped tags, capped at MAX_TAGS; picking a new one past the cap is simply refused.
  const toggleTag = (id: string) =>
    setTagIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : ids.length >= MAX_TAGS ? ids : [...ids, id]));
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
        <Input name="description" placeholder="Short summary" required defaultValue={state.values?.description} />
        <FieldError errors={state.error?.description} />
      </Labeled>
      <Labeled label="Accountable">
        <Select name="accountableId" required defaultValue={state.values?.accountableId ?? ""}>
          <option value="" disabled>Assign accountable…</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
        </Select>
        <FieldError errors={state.error?.accountableId} />
      </Labeled>
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Stage">
          <Select name="stage" value={stage} onChange={(e) => { setStage(e.target.value); setStatusId(""); setTagIds([]); }}>
            {STAGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <FieldError errors={state.error?.stage} />
        </Labeled>
        <Labeled label="Status">
          <Select name="statusId" required value={statusId} onChange={(e) => setStatusId(e.target.value)}>
            <option value="" disabled>Select status…</option>
            {stageStatuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </Select>
          <FieldError errors={state.error?.statusId} />
        </Labeled>
      </div>
      <fieldset>
        <legend className="mb-1.5 block text-xs font-medium text-ggrey">
          Tags <span className="font-normal tabular-nums">({tagIds.length}/{MAX_TAGS}, at least {MIN_TAGS})</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {stageTags.length === 0 && <span className="text-sm text-ggrey">No tags defined for this stage</span>}
          {stageTags.map((t) => {
            const on = tagIds.includes(t.id);
            const locked = !on && tagIds.length >= MAX_TAGS;
            return (
              <label
                key={t.id}
                title={locked ? `At most ${MAX_TAGS} tags` : undefined}
                className={`g-press inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                  on ? "cursor-pointer border-gblue bg-gblue-50 text-gblue"
                  : locked ? "cursor-not-allowed border-dashed border-gline-2 text-ggrey-2"
                  : "cursor-pointer border-dashed border-gline text-ggrey hover:border-gblue hover:text-gblue"
                }`}
              >
                <input type="checkbox" name="tagIds" value={t.id} checked={on} disabled={locked} onChange={() => toggleTag(t.id)} className="sr-only" />
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{on ? "check" : "add"}</span>
                {t.label}
              </label>
            );
          })}
        </div>
        <FieldError errors={state.error?.tagIds} />
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="PR">
          <Input name="revenue" type="number" step="0.01" placeholder="0.00" required defaultValue={state.values?.revenue} onChange={(e) => setRevenue(Number(e.target.value))} />
          <FieldError errors={state.error?.revenue} />
        </Labeled>
        <Labeled label="MR %">
          <Input name="marginPct" type="number" step="0.01" placeholder="0" required defaultValue={state.values?.marginPct} onChange={(e) => setMargin(Number(e.target.value))} />
          <FieldError errors={state.error?.marginPct} />
        </Labeled>
      </div>
      <div className="flex items-center justify-between rounded-md bg-ggreen-50 px-4 py-2.5">
        <span className="text-sm text-gink-2">PGP</span>
        <span className="text-base font-semibold tabular-nums text-ggreen">{money(grossProfit(revenue, margin))}</span>
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
