"use client";
import { useActionState, useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Icon } from "@/components/ui/Icon";
import { FieldError } from "@/components/ui/FieldError";
import { saveMeetingAction } from "@/actions/meeting-actions";
import type { FormState } from "@/lib/action-state";

export type MeetingDraft = {
  id?: string; subject: string; start: string; end: string; location: string; attendees: string; online: boolean;
  notes?: string; opportunityId: string;
};
type Option = { id: string; label: string };

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ggrey">{label}</span>
      {children}
    </label>
  );
}

function MeetingForm({ draft, opportunities, onDone }: { draft: MeetingDraft; opportunities: Option[]; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveMeetingAction.bind(null, draft.id ?? null), {} as FormState);
  useEffect(() => { if (state.ok) onDone(); }, [state, onDone]);
  const v = (k: keyof MeetingDraft) => state.values?.[k] ?? String(draft[k] ?? "");
  return (
    <form action={action} className="space-y-4">
      <Labeled label="Subject">
        <Input name="subject" required defaultValue={v("subject")} placeholder="e.g. Demo with Acme" />
        <FieldError errors={state.error?.subject} />
      </Labeled>
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Start">
          <Input name="start" type="datetime-local" required defaultValue={v("start")} />
          <FieldError errors={state.error?.start} />
        </Labeled>
        <Labeled label="End">
          <Input name="end" type="datetime-local" required defaultValue={v("end")} />
          <FieldError errors={state.error?.end} />
        </Labeled>
      </div>
      <Labeled label="Attendees (emails, comma separated)">
        <Input name="attendees" defaultValue={v("attendees")} placeholder="jane@client.com, bob@client.com" />
        <FieldError errors={state.error?.attendees} />
      </Labeled>
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Location">
          <Input name="location" defaultValue={v("location")} placeholder="Office, address…" />
        </Labeled>
        <Labeled label="Opportunity">
          <Select name="opportunityId" defaultValue={v("opportunityId")}>
            <option value="">None</option>
            {opportunities.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </Select>
        </Labeled>
      </div>
      <label className="flex items-center gap-2 text-sm text-gink-2">
        <input type="checkbox" name="online" defaultChecked={state.values ? state.values.online === "on" : draft.online} className="accent-gblue" />
        Teams meeting
      </label>
      {!draft.id && (
        <Labeled label="Notes">
          <Textarea name="notes" rows={3} defaultValue={v("notes")} />
        </Labeled>
      )}
      {state.error?._form && <p className="text-sm text-gred">{state.error._form[0]}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : draft.id ? "Save changes" : "Send invites"}</Button>
      </div>
    </form>
  );
}

/** Controlled create/edit dialog; `draft` null means closed. Saving writes to Outlook first, so invites go out from the user's mailbox. */
export function MeetingDialog({ draft, opportunities, onClose }: { draft: MeetingDraft | null; opportunities: Option[]; onClose: () => void }) {
  return (
    <Dialog open={!!draft} onClose={onClose} title={draft?.id ? "Edit meeting" : "New meeting"} size="lg">
      {draft && <MeetingForm draft={draft} opportunities={opportunities} onDone={onClose} />}
    </Dialog>
  );
}

/** Button that opens the create/edit meeting form. */
export function MeetingDialogButton({ draft, opportunities, label, icon = "add", variant = "primary" }: {
  draft: MeetingDraft; opportunities: Option[]; label: string; icon?: string; variant?: "primary" | "outline" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant={variant} onClick={() => setOpen(true)} className={variant === "ghost" ? "h-8 px-2.5" : undefined}>
        <Icon name={icon} />
        {label}
      </Button>
      <MeetingDialog draft={open ? draft : null} opportunities={opportunities} onClose={() => setOpen(false)} />
    </>
  );
}
