"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { cancelMeetingAction, linkMeetingAction } from "@/actions/meeting-actions";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { MeetingItem } from "@/components/meetings/MeetingList";
import type { MeetingDraft } from "@/components/meetings/MeetingDialog";

type Option = { id: string; label: string };

/** Event popup content for the calendar: details, opportunity link, edit (organizer) and cancel. */
export function MeetingDetails({ m, opportunities, onEdit, onClose }: {
  m: MeetingItem; opportunities: Option[]; onEdit: (d: MeetingDraft) => void; onClose: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ error?: string }>, closeOnOk = false) =>
    start(async () => {
      const r = await fn();
      setError(r.error ?? null);
      if (!r.error && closeOnOk) onClose();
    });

  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-1.5 text-gink-2">
        <p className="flex items-center gap-2">
          <Icon name="schedule" />
          {m.day} · {m.isAllDay ? "All day" : m.time}
        </p>
        {m.location && <p className="flex items-center gap-2"><Icon name="location_on" />{m.location}</p>}
        {m.organizer && <p className="flex items-center gap-2"><Icon name="person" />Organizer: {m.isOrganizer ? "you" : m.organizer}</p>}
        {m.attendees.length > 0 && (
          <div className="flex items-start gap-2">
            <Icon name="group" />
            <ul className="space-y-0.5">
              {m.attendees.map((a, i) => <li key={i}>{a.name || a.email}{a.name && a.email ? <span className="text-ggrey"> · {a.email}</span> : null}</li>)}
            </ul>
          </div>
        )}
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-ggrey">Opportunity</span>
        <div className="flex items-center gap-2">
          <select
            value={m.opportunity?.id ?? ""}
            disabled={pending}
            onChange={(e) => run(() => linkMeetingAction(m.id, e.target.value))}
            className="h-9 flex-1 rounded-md border border-gline bg-gsurface px-2.5 text-sm text-gink outline-none hover:border-ggrey-2 focus:border-gblue"
          >
            <option value="">No opportunity</option>
            {opportunities.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          {m.opportunity && (
            <Link href={`/opportunities/${m.opportunity.id}`} className="text-sm text-gblue hover:underline">Open</Link>
          )}
        </div>
      </label>

      {error && <p role="alert" className="text-sm text-gred">{error}</p>}

      <div className="flex flex-wrap justify-end gap-2 border-t border-gline-2 pt-4">
        {m.webLink && (
          <a href={m.webLink} target="_blank" rel="noreferrer" className="mr-auto inline-flex h-9 items-center gap-1.5 text-sm text-gblue hover:underline">
            <Icon name="open_in_new" /> Open in Outlook
          </a>
        )}
        {m.joinUrl && !m.past && (
          <a href={m.joinUrl} target="_blank" rel="noreferrer" className="g-press inline-flex h-9 items-center gap-1.5 rounded-md bg-gviolet px-4 text-sm font-medium text-white">
            <Icon name="videocam" /> Join
          </a>
        )}
        {!m.past && (
          <Button
            variant="ghost"
            className="text-gred hover:bg-gred-50"
            disabled={pending}
            onClick={() => {
              if (confirm(m.isOrganizer ? `Cancel "${m.subject}"? Attendees will be notified.` : `Remove "${m.subject}" from your calendar?`)) {
                run(() => cancelMeetingAction(m.id, m.opportunity?.id ?? null), true);
              }
            }}
          >
            <Icon name="event_busy" />
            {m.isOrganizer ? "Cancel meeting" : "Remove"}
          </Button>
        )}
        {m.isOrganizer && !m.past && (
          <Button variant="outline" disabled={pending} onClick={() => onEdit(m.draft)}>
            <Icon name="edit" />
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}
