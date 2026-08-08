// Multi-day Google Calendar events must block every day they touch, not just
// their first day. Run via `npm test` (Node's built-in test runner).
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  deriveIntervalsFromFreeBusy,
  deriveRangeIntervalsFromFreeBusy,
} from "../src/lib/google-calendar.server.ts";
import { freeStartsForDay } from "../src/lib/whatsapp-dialog.server.ts";
import type { StudioRecord, TreatmentRecord } from "../src/lib/studio.server.ts";

const TZ = "Europe/Zurich";
const CAL = "studio-test-calendar";

function freeBusyJson(busy: { start: string; end: string }[]) {
  return { calendars: { [CAL]: { busy } } };
}

// Opening hours 09:00–19:00 on all seven weekdays (minutes since midnight).
const openingHours: Record<string, { open: number; close: number }> = {};
for (let d = 0; d < 7; d += 1) openingHours[String(d)] = { open: 540, close: 1140 };

const studio = {
  opening_hours: openingHours,
  buffer_minutes: 30,
  slot_step_minutes: 30,
  timezone: TZ,
} as unknown as StudioRecord;

const st = { studio, treatments: [] as TreatmentRecord[] };

// 14-day all-day vacation: 1.–14. August 2026 in Europe/Zurich (UTC+2).
const vacation = freeBusyJson([{ start: "2026-07-31T22:00:00Z", end: "2026-08-14T22:00:00Z" }]);

function augustDay(n: number): string {
  return `2026-08-${String(n).padStart(2, "0")}`;
}

test("a 14-day all-day event yields one full-day busy segment per touched day", () => {
  const segments = deriveRangeIntervalsFromFreeBusy(vacation, CAL, TZ);
  assert.equal(segments.length, 14);
  for (let i = 0; i < 14; i += 1) {
    assert.deepEqual(segments[i], { day: augustDay(i + 1), time: "00:00", duration: 1440 });
  }
});

test("freeStartsForDay offers no slots on any of the 14 vacation days", () => {
  const busy = deriveRangeIntervalsFromFreeBusy(vacation, CAL, TZ);
  const now = new Date("2026-07-20T08:00:00Z");
  for (let i = 1; i <= 14; i += 1) {
    const day = augustDay(i);
    assert.deepEqual(
      freeStartsForDay(st, day, 60, busy, now),
      [],
      `expected ${day} to be fully blocked`,
    );
  }
});

test("the days before and after the vacation stay bookable", () => {
  const busy = deriveRangeIntervalsFromFreeBusy(vacation, CAL, TZ);
  const now = new Date("2026-07-20T08:00:00Z");
  assert.ok(freeStartsForDay(st, "2026-07-31", 60, busy, now).length > 0);
  assert.ok(freeStartsForDay(st, "2026-08-15", 60, busy, now).length > 0);
});

test("the single-day view sees a multi-day event on a middle day", () => {
  assert.deepEqual(deriveIntervalsFromFreeBusy(augustDay(7), vacation, CAL, TZ), [
    { time: "00:00", duration: 1440 },
  ]);
});

test("an overnight event 23:00–01:00 blocks both days", () => {
  const overnight = freeBusyJson([{ start: "2026-08-20T21:00:00Z", end: "2026-08-20T23:00:00Z" }]);
  assert.deepEqual(deriveRangeIntervalsFromFreeBusy(overnight, CAL, TZ), [
    { day: "2026-08-20", time: "23:00", duration: 60 },
    { day: "2026-08-21", time: "00:00", duration: 60 },
  ]);
  assert.deepEqual(deriveIntervalsFromFreeBusy("2026-08-21", overnight, CAL, TZ), [
    { time: "00:00", duration: 60 },
  ]);
});

test("the DST switch day keeps its full local length (25h on 2026-10-25)", () => {
  // Europe/Zurich leaves DST on 25 October 2026; that local day has 25 hours.
  const dstDay = freeBusyJson([{ start: "2026-10-24T22:00:00Z", end: "2026-10-25T23:00:00Z" }]);
  assert.deepEqual(deriveRangeIntervalsFromFreeBusy(dstDay, CAL, TZ), [
    { day: "2026-10-25", time: "00:00", duration: 1500 },
  ]);
});
