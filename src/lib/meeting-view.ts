import type { Prisma } from "@prisma/client";
import { dateOnly, opportunityRef, shortDate, timeOfDay, utcToZonedInput } from "@/lib/format";
import type { MeetingItem } from "@/components/meetings/MeetingList";

type Row = {
  id: string; subject: string; start: Date; end: Date; isAllDay: boolean; location: string | null; joinUrl: string | null;
  webLink: string | null; organizer: string | null; isOrganizer: boolean; attendees: Prisma.JsonValue; opportunityId: string | null;
  opportunity: { id: string; number: number; title: string } | null;
};
type Attendee = { name: string | null; email: string | null };

/** Server-side shaping for the client list: dates pre-formatted in the app zone. */
export function toMeetingItems(rows: Row[], now = new Date()): MeetingItem[] {
  return rows.map((m) => {
    const attendees = (Array.isArray(m.attendees) ? m.attendees : []) as Attendee[];
    return {
      id: m.id,
      subject: m.subject,
      // All-day events are stored as UTC midnight; don't shift them into the app zone.
      day: m.isAllDay ? dateOnly(m.start) : shortDate(m.start),
      time: `${timeOfDay(m.start)}–${timeOfDay(m.end)}`,
      isAllDay: m.isAllDay,
      past: m.end < now,
      location: m.location,
      joinUrl: m.joinUrl,
      webLink: m.webLink,
      organizer: m.organizer,
      isOrganizer: m.isOrganizer,
      attendees,
      opportunity: m.opportunity ? { id: m.opportunity.id, label: `${opportunityRef(m.opportunity.number)} ${m.opportunity.title}` } : null,
      startLocal: m.isAllDay ? m.start.toISOString().slice(0, 10) : utcToZonedInput(m.start),
      endLocal: m.isAllDay ? m.end.toISOString().slice(0, 10) : utcToZonedInput(m.end),
      draft: {
        id: m.id, subject: m.subject, start: utcToZonedInput(m.start), end: utcToZonedInput(m.end), location: m.location ?? "",
        attendees: attendees.map((a) => a.email).filter(Boolean).join(", "), online: !!m.joinUrl, opportunityId: m.opportunityId ?? "",
      },
    };
  });
}

/** Defaults for a new meeting: next full hour, one hour long. */
export function newMeetingDraft(opportunityId = "", now = new Date()) {
  const start = new Date(Math.ceil(now.getTime() / 3_600_000) * 3_600_000);
  const end = new Date(start.getTime() + 3_600_000);
  return { subject: "", start: utcToZonedInput(start), end: utcToZonedInput(end), location: "", attendees: "", online: true, opportunityId };
}
