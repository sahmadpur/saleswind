import { describe, it, expect } from "vitest";
import { daySegments } from "@/components/meetings/MeetingsView";
import type { MeetingItem } from "@/components/meetings/MeetingList";

const m = (id: string, startLocal: string, endLocal: string, isAllDay = false) => ({ id, startLocal, endLocal, isAllDay }) as MeetingItem;

describe("daySegments", () => {
  it("places overlapping meetings side by side and lone ones full width", () => {
    const segs = daySegments([
      m("a", "2026-09-22T09:00", "2026-09-22T10:00"),
      m("b", "2026-09-22T09:30", "2026-09-22T11:00"),
      m("c", "2026-09-22T10:00", "2026-09-22T10:30"),
      m("d", "2026-09-22T14:00", "2026-09-22T15:00"),
    ], "2026-09-22");
    const by = Object.fromEntries(segs.map((s) => [s.m.id, [s.col, s.cols]]));
    expect(by).toEqual({ a: [0, 2], b: [1, 2], c: [0, 2], d: [0, 1] });
  });
  it("splits multi-day meetings at midnight and skips all-day and other days", () => {
    const items = [m("x", "2026-09-22T22:00", "2026-09-23T02:00"), m("y", "2026-09-22", "2026-09-23", true)];
    expect(daySegments(items, "2026-09-22").map((s) => [s.m.id, s.start, s.end])).toEqual([["x", 1320, 1440]]);
    expect(daySegments(items, "2026-09-23").map((s) => [s.m.id, s.start, s.end])).toEqual([["x", 0, 120]]);
    expect(daySegments(items, "2026-09-24")).toEqual([]);
  });
});
