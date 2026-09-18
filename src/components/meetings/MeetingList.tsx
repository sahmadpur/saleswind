"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { cancelMeetingAction, linkMeetingAction } from "@/actions/meeting-actions";
import { MeetingDialogButton, type MeetingDraft } from "@/components/meetings/MeetingDialog";
import { cn } from "@/lib/cn";

export type MeetingItem = {
  id: string; subject: string; day: string; time: string; isAllDay: boolean; past: boolean;
  location: string | null; joinUrl: string | null; webLink: string | null; organizer: string | null; isOrganizer: boolean;
  attendees: { name: string | null; email: string | null }[];
  opportunity: { id: string; label: string } | null;
  draft: MeetingDraft;
  /** Calendar placement in the app zone: "YYYY-MM-DDTHH:mm". All-day events use dates only ("YYYY-MM-DD", end exclusive). */
  startLocal: string; endLocal: string;
};
type Option = { id: string; label: string };

function Row({ m, opportunities }: { m: MeetingItem; opportunities: Option[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ error?: string }>) => start(async () => { const r = await fn(); setError(r.error ?? null); });
  const people = m.attendees.map((a) => a.name || a.email).filter(Boolean);

  return (
    <li className={cn("flex flex-wrap items-start gap-x-4 gap-y-2 px-5 py-3.5", m.past && "opacity-70", pending && "opacity-50")}>
      <div className="w-24 shrink-0 pt-0.5 text-sm tabular-nums text-gink-2">{m.isAllDay ? "All day" : m.time}</div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gink">{m.subject}</span>
          {m.joinUrl && !m.past && (
            <a href={m.joinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-gviolet-50 px-2 py-0.5 text-xs font-medium text-gviolet hover:underline">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>videocam</span>
              Join
            </a>
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ggrey">
          {m.location && <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>{m.location}</span>}
          {m.organizer && !m.isOrganizer && <span>Organizer: {m.organizer}</span>}
          {people.length > 0 && <span className="truncate" title={people.join(", ")}>With {people.slice(0, 3).join(", ")}{people.length > 3 ? ` +${people.length - 3}` : ""}</span>}
        </div>
        {error && <p role="alert" className="text-xs text-gred">{error}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <select
          aria-label="Linked opportunity"
          value={m.opportunity?.id ?? ""}
          disabled={pending}
          onChange={(e) => run(() => linkMeetingAction(m.id, e.target.value))}
          className="h-8 max-w-52 rounded-md border border-gline bg-gsurface px-2 text-xs text-gink-2 outline-none hover:border-ggrey-2 focus:border-gblue"
        >
          <option value="">No opportunity</option>
          {opportunities.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        {m.opportunity && (
          <Link href={`/opportunities/${m.opportunity.id}`} title={m.opportunity.label} className="grid h-8 w-8 place-items-center rounded-md text-ggrey hover:bg-ghover hover:text-gblue">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>open_in_new</span>
          </Link>
        )}
        {m.isOrganizer && !m.past && (
          <MeetingDialogButton draft={m.draft} opportunities={opportunities} label="" icon="edit" variant="ghost" />
        )}
        {!m.past && (
          <button
            type="button"
            title={m.isOrganizer ? "Cancel meeting (notifies attendees)" : "Remove from my calendar"}
            aria-label="Cancel meeting"
            disabled={pending}
            onClick={() => {
              if (confirm(m.isOrganizer ? `Cancel "${m.subject}"? Attendees will be notified.` : `Remove "${m.subject}" from your calendar?`)) {
                run(() => cancelMeetingAction(m.id, m.opportunity?.id ?? null));
              }
            }}
            className="grid h-8 w-8 place-items-center rounded-md text-ggrey hover:bg-gred-50 hover:text-gred"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>event_busy</span>
          </button>
        )}
      </div>
    </li>
  );
}

/** Meetings grouped by day (dates pre-formatted on the server). */
export function MeetingList({ meetings, opportunities, empty }: { meetings: MeetingItem[]; opportunities: Option[]; empty: string }) {
  if (meetings.length === 0) return <p className="px-5 py-10 text-center text-sm text-ggrey">{empty}</p>;
  const days: { day: string; items: MeetingItem[] }[] = [];
  for (const m of meetings) {
    const last = days[days.length - 1];
    if (last?.day === m.day) last.items.push(m);
    else days.push({ day: m.day, items: [m] });
  }
  return (
    <div>
      {days.map((d) => (
        <section key={d.day}>
          <h3 className="border-y border-gline-2 bg-gbg px-5 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-ggrey first:border-t-0">{d.day}</h3>
          <ul className="divide-y divide-gline-2">
            {d.items.map((m) => <Row key={m.id} m={m} opportunities={opportunities} />)}
          </ul>
        </section>
      ))}
    </div>
  );
}
