"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { MeetingDialog, type MeetingDraft } from "@/components/meetings/MeetingDialog";
import { MeetingDetails } from "@/components/meetings/MeetingDetails";
import { MeetingList, type MeetingItem } from "@/components/meetings/MeetingList";
import { cn } from "@/lib/cn";

/**
 * Outlook-style calendar (Day / Week / Month) plus the list. All placement uses wall-clock strings
 * in the app zone computed on the server, so the grid never depends on the viewer's browser zone.
 * Click an empty slot to schedule a meeting there; click an event for details.
 */

type View = "day" | "week" | "month" | "list";
type Option = { id: string; label: string };

const HOUR = 48; // px per hour in the time grid
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const VIEW_KEY = "saleswind:meetings-view";

// --- pure "YYYY-MM-DD" date math (UTC-based so no zone or DST drift) ---
const toUtc = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
const fromUtc = (t: number) => new Date(t).toISOString().slice(0, 10);
const addDays = (d: string, n: number) => fromUtc(toUtc(d) + n * 86_400_000);
/** 0 = Monday … 6 = Sunday. */
const weekday = (d: string) => (new Date(toUtc(d)).getUTCDay() + 6) % 7;
const startOfWeek = (d: string) => addDays(d, -weekday(d));
const dm = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}`;
const dmy = (d: string) => `${dm(d)}.${d.slice(0, 4)}`;
const minutes = (local: string) => +local.slice(11, 13) * 60 + +local.slice(14, 16);
const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

type Segment = { m: MeetingItem; start: number; end: number; col: number; cols: number };

/** Timed pieces of each meeting per day (multi-day meetings are split at midnight), laid out in side-by-side columns when they overlap. */
export function daySegments(items: MeetingItem[], day: string): Segment[] {
  const segs: Segment[] = [];
  for (const m of items) {
    if (m.isAllDay) continue;
    const sd = m.startLocal.slice(0, 10), ed = m.endLocal.slice(0, 10);
    if (day < sd || day > ed) continue;
    const start = day === sd ? minutes(m.startLocal) : 0;
    const end = day === ed ? minutes(m.endLocal) : 24 * 60;
    if (end > start) segs.push({ m, start, end, col: 0, cols: 1 });
  }
  segs.sort((a, b) => a.start - b.start || b.end - a.end);
  // Clusters of transitively overlapping events share a column count.
  let cluster: Segment[] = [], colEnds: number[] = [], clusterEnd = -1;
  const flush = () => { for (const s of cluster) s.cols = colEnds.length; cluster = []; colEnds = []; };
  for (const s of segs) {
    if (s.start >= clusterEnd) { flush(); clusterEnd = -1; }
    let col = colEnds.findIndex((e) => e <= s.start);
    if (col === -1) { col = colEnds.length; colEnds.push(s.end); } else colEnds[col] = s.end;
    s.col = col;
    cluster.push(s);
    clusterEnd = Math.max(clusterEnd, s.end);
  }
  flush();
  return segs;
}

const allDayOn = (items: MeetingItem[], day: string) =>
  items.filter((m) => m.isAllDay && m.startLocal <= day && day < m.endLocal);

/** Timed and all-day meetings touching a day, all-day first then by start. */
const onDay = (items: MeetingItem[], day: string) => [
  ...allDayOn(items, day),
  ...items.filter((m) => !m.isAllDay && m.startLocal.slice(0, 10) <= day && day <= m.endLocal.slice(0, 10)).sort((a, b) => a.startLocal.localeCompare(b.startLocal)),
];

/** Same green as the primary "New meeting" button. */
const EVENT_TONE = "border-gblue-dark bg-gblue text-white hover:bg-gblue-hover";

/** Small link glyph before the subject of meetings tied to an opportunity. */
function Linked({ m }: { m: MeetingItem }) {
  if (!m.opportunity) return null;
  return <span className="material-symbols-outlined mr-0.5 align-[-2px] opacity-90" style={{ fontSize: 12 }} title={m.opportunity.label}>link</span>;
}

function TimeGrid({ days, items, today, nowMin, onSlot, onOpen }: {
  days: string[]; items: MeetingItem[]; today: string; nowMin: number;
  onSlot: (day: string, min: number) => void; onOpen: (m: MeetingItem) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  // Start the view at 08:00 like Outlook.
  useLayoutEffect(() => { if (scroller.current) scroller.current.scrollTop = 8 * HOUR - 8; }, []);
  const allDay = days.map((d) => allDayOn(items, d));
  const hasAllDay = allDay.some((a) => a.length > 0);
  const cols = `3.5rem repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <div className="overflow-hidden">
      <div className="grid border-b border-gline" style={{ gridTemplateColumns: cols }}>
        <div />
        {days.map((d) => (
          <div key={d} className={cn("border-l border-gline-2 px-2 py-2 text-center", d === today && "text-gblue")}>
            <div className="text-[11px] font-medium uppercase tracking-wide text-ggrey">{DAY_NAMES[weekday(d)]}</div>
            <div className={cn("mx-auto mt-0.5 grid h-8 w-8 place-items-center rounded-full text-base font-semibold tabular-nums", d === today ? "bg-gblue text-white" : "text-gink")}>
              {d.slice(8, 10)}
            </div>
          </div>
        ))}
      </div>
      {hasAllDay && (
        <div className="grid border-b border-gline" style={{ gridTemplateColumns: cols }}>
          <div className="px-1 py-1.5 text-right text-[10px] text-ggrey-2">all day</div>
          {allDay.map((list, i) => (
            <div key={days[i]} className="space-y-0.5 border-l border-gline-2 p-0.5">
              {list.map((m) => (
                <button key={m.id} type="button" onClick={() => onOpen(m)} className={cn("block w-full truncate rounded border-l-[3px] px-1.5 py-0.5 text-left text-xs font-medium", EVENT_TONE, m.past && "opacity-60")}>
                  <Linked m={m} />{m.subject}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
      <div ref={scroller} className="relative max-h-[68vh] overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: cols, height: 24 * HOUR }}>
          <div className="relative">
            {Array.from({ length: 23 }, (_, h) => (
              <span key={h} className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-ggrey-2" style={{ top: (h + 1) * HOUR }}>
                {hhmm((h + 1) * 60)}
              </span>
            ))}
          </div>
          {days.map((d) => (
            <div
              key={d}
              title={`Click to schedule on ${dmy(d)}`}
              className="relative cursor-pointer border-l border-gline-2"
              style={{ backgroundImage: `repeating-linear-gradient(to bottom, var(--color-gline-2) 0 1px, transparent 1px ${HOUR / 2}px, color-mix(in srgb, var(--color-gline-2) 50%, transparent) ${HOUR / 2}px ${HOUR / 2 + 1}px, transparent ${HOUR / 2 + 1}px ${HOUR}px)` }}
              onClick={(e) => {
                const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
                onSlot(d, Math.max(0, Math.min(23 * 60 + 30, Math.floor(y / (HOUR / 2)) * 30)));
              }}
            >
              {d === today && (
                <div className="pointer-events-none absolute inset-x-0 z-20 h-0.5 bg-gred" style={{ top: (nowMin / 60) * HOUR }}>
                  <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-gred" />
                </div>
              )}
              {daySegments(items, d).map((s) => {
                const height = Math.max(((s.end - s.start) / 60) * HOUR - 2, 18);
                return (
                  <button
                    key={s.m.id}
                    type="button"
                    title={`${s.m.time} ${s.m.subject}`}
                    onClick={(e) => { e.stopPropagation(); onOpen(s.m); }}
                    className={cn("absolute z-10 overflow-hidden rounded border-l-[3px] px-1.5 py-0.5 text-left text-xs leading-tight shadow-g1", EVENT_TONE, s.m.past && "opacity-60")}
                    style={{ top: (s.start / 60) * HOUR + 1, height, left: `calc(${(s.col / s.cols) * 100}% + 2px)`, width: `calc(${100 / s.cols}% - 4px)` }}
                  >
                    <span className="block truncate font-semibold"><Linked m={s.m} />{s.m.subject}</span>
                    {height > 30 && <span className="block truncate opacity-80">{hhmm(s.start)}–{hhmm(s.end % 1440)}</span>}
                    {height > 46 && s.m.location && <span className="block truncate opacity-70">{s.m.location}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonthGrid({ anchor, items, today, onDay: pickDay, onNew, onOpen }: {
  anchor: string; items: MeetingItem[]; today: string;
  onDay: (d: string) => void; onNew: (d: string) => void; onOpen: (m: MeetingItem) => void;
}) {
  const first = `${anchor.slice(0, 7)}-01`;
  const start = startOfWeek(first);
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  return (
    <div>
      <div className="grid grid-cols-7 border-b border-gline">
        {DAY_NAMES.map((n) => <div key={n} className="px-2 py-2 text-[11px] font-medium uppercase tracking-wide text-ggrey">{n}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const list = onDay(items, d);
          const inMonth = d.slice(0, 7) === anchor.slice(0, 7);
          return (
            <div
              key={d}
              onClick={() => onNew(d)}
              className={cn("min-h-28 cursor-pointer border-b border-l border-gline-2 p-1 transition-colors hover:bg-ghover/60 [&:nth-child(7n+1)]:border-l-0", !inMonth && "bg-gbg")}
            >
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); pickDay(d); }}
                className={cn("mb-0.5 grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs font-medium tabular-nums hover:bg-gline", d === today ? "bg-gblue text-white hover:bg-gblue" : inMonth ? "text-gink" : "text-ggrey-2")}
              >
                {+d.slice(8, 10)}
              </button>
              <div className="space-y-0.5">
                {list.slice(0, 3).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onOpen(m); }}
                    className={cn("block w-full truncate rounded px-1 py-px text-left text-[11px]", m.isAllDay ? cn("border-l-[3px] font-medium", EVENT_TONE) : "text-gink-2 hover:bg-gline-2", m.past && "opacity-60")}
                  >
                    {!m.isAllDay && <span className="mr-1 inline-block h-2 w-2 rounded-full bg-gblue align-middle" />}
                    {!m.isAllDay && <span className="mr-1 tabular-nums text-ggrey">{m.startLocal.slice(0, 10) === d ? m.startLocal.slice(11, 16) : "…"}</span>}
                    <Linked m={m} />{m.subject}
                  </button>
                ))}
                {list.length > 3 && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); pickDay(d); }} className="px-1 text-[11px] font-medium text-gblue hover:underline">
                    +{list.length - 3} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MeetingsView({ meetings, opportunities, nowLocal, windowStart, windowEnd, readOnly }: {
  meetings: MeetingItem[]; opportunities: Option[]; nowLocal: string; windowStart: string; windowEnd: string;
  /** Someone else's calendar: show it, but offer no way to change it. */
  readOnly?: boolean;
}) {
  const today = nowLocal.slice(0, 10);
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(today);
  const [draft, setDraft] = useState<MeetingDraft | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = meetings.find((m) => m.id === openId) ?? null;

  // Remember the last view per browser; storage can be unavailable, so ignore failures.
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(VIEW_KEY); } catch {}
    if (saved === "day" || saved === "week" || saved === "month" || saved === "list") queueMicrotask(() => setView(saved as View));
  }, []);
  function pickView(v: View) {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch {}
  }

  const days = useMemo(() => (view === "day" ? [anchor] : Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i))), [view, anchor]);
  const step = (dir: -1 | 1) => {
    if (view === "day") setAnchor(addDays(anchor, dir));
    else if (view === "week") setAnchor(addDays(anchor, 7 * dir));
    else {
      const y = +anchor.slice(0, 4), m = +anchor.slice(5, 7) - 1 + dir;
      setAnchor(fromUtc(Date.UTC(y, m, 1)));
    }
  };
  const title =
    view === "month" ? `${MONTHS[+anchor.slice(5, 7) - 1]} ${anchor.slice(0, 4)}`
    : view === "day" ? `${DAY_NAMES[weekday(anchor)]}, ${dmy(anchor)}`
    : `${dm(days[0])} – ${dmy(days[6])}`;

  const newAt = (day: string, min: number) => {
    if (readOnly) return;
    const end = Math.min(min + 60, 24 * 60 - 1);
    setDraft({ subject: "", start: `${day}T${hhmm(min)}`, end: `${day}T${hhmm(end)}`, location: "", attendees: "", online: true, opportunityId: "" });
  };
  const nextHour = () => Math.min(Math.ceil((minutes(nowLocal) + 1) / 60) * 60, 23 * 60);
  const outsideWindow = view !== "list" && (days[days.length - 1] < windowStart || days[0] > windowEnd || (view === "month" && (anchor.slice(0, 7) < windowStart.slice(0, 7) || anchor.slice(0, 7) > windowEnd.slice(0, 7))));

  const upcoming = meetings.filter((m) => !m.past);
  const past = meetings.filter((m) => m.past).reverse();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {!readOnly && (
          <Button onClick={() => newAt(today, nextHour())}>
            <Icon name="add" />
            New meeting
          </Button>
        )}
        {view !== "list" && (
          <>
            <Button variant="outline" onClick={() => setAnchor(today)}>Today</Button>
            <div className="flex">
              <button type="button" aria-label="Previous" onClick={() => step(-1)} className="grid h-9 w-9 place-items-center rounded-md text-ggrey hover:bg-ghover hover:text-gink">
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>chevron_left</span>
              </button>
              <button type="button" aria-label="Next" onClick={() => step(1)} className="grid h-9 w-9 place-items-center rounded-md text-ggrey hover:bg-ghover hover:text-gink">
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>chevron_right</span>
              </button>
            </div>
            <h2 className="text-lg font-semibold tabular-nums text-gink">{title}</h2>
          </>
        )}
        <div role="tablist" className="ml-auto inline-flex rounded-md border border-gline bg-gsurface p-0.5">
          {(["day", "week", "month", "list"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              type="button"
              onClick={() => pickView(v)}
              className={cn("h-8 rounded px-3 text-sm font-medium capitalize transition-colors", view === v ? "bg-gblue-100 text-gblue-dark" : "text-ggrey hover:text-gink")}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {outsideWindow && (
        <p className="text-xs text-ggrey">Saleswind mirrors your calendar from {dmy(windowStart)} to {dmy(windowEnd)}; open Outlook for dates outside that range.</p>
      )}

      <div className="overflow-hidden rounded-lg border border-gline-2 bg-gsurface">
        {view === "month" ? (
          <MonthGrid
            anchor={anchor}
            items={meetings}
            today={today}
            onDay={(d) => { setAnchor(d); pickView("day"); }}
            onNew={(d) => newAt(d, 9 * 60)}
            onOpen={(m) => setOpenId(m.id)}
          />
        ) : view === "list" ? (
          <div>
            <div className="border-b border-gline-2 px-5 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-ggrey">Upcoming</div>
            <MeetingList meetings={upcoming} opportunities={opportunities} empty="No upcoming meetings." readOnly={readOnly} />
            <div className="border-y border-gline-2 px-5 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-ggrey">Past</div>
            <MeetingList meetings={past} opportunities={opportunities} empty="No past meetings." readOnly={readOnly} />
          </div>
        ) : (
          <TimeGrid days={days} items={meetings} today={today} nowMin={minutes(nowLocal)} onSlot={newAt} onOpen={(m) => setOpenId(m.id)} />
        )}
      </div>

      <Dialog open={!!open} onClose={() => setOpenId(null)} title={open?.subject} size="md">
        {open && (
          <MeetingDetails
            m={open}
            opportunities={opportunities}
            onClose={() => setOpenId(null)}
            onEdit={(d) => { setOpenId(null); setDraft(d); }}
            readOnly={readOnly}
          />
        )}
      </Dialog>
      {!readOnly && <MeetingDialog draft={draft} opportunities={opportunities} onClose={() => setDraft(null)} />}
    </div>
  );
}
