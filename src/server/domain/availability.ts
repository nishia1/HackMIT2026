import type { BusyBlock } from "@/server/external/calendar";

/**
 * TWO BUSY CALENDARS → A FEW REAL SLOTS.
 *
 * Pure. `now` is an argument, like everywhere else in domain/.
 *
 * The upgrade this buys: `when` goes from "Thursday evening" to "Thursday the
 * 25th, 7–9pm", which is the difference between a suggestion and something you
 * can send to someone.
 *
 * Degrades in steps rather than all at once:
 *   both calendars  → real gaps, both free
 *   one calendar    → their profile evenings minus one person's conflicts
 *   no calendars    → profile evenings only, which is what we did before
 *
 * Times are computed in the server's local zone. For a hackathon where
 * everyone is in one city that's fine; if you ever run this across zones,
 * carry each user's IANA zone on their profile and convert here.
 */

export type Slot = {
  startsAt: string; // ISO
  endsAt: string;
  label: string; // "Thursday the 25th, 7–9pm"
  confident: boolean; // true when a real calendar backed it
};

const HOUR = 3_600_000;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function findSlots({
  now,
  freeEvenings,
  busyA = null,
  busyB = null,
  eveningStartHour = 18,
  eveningEndHour = 22,
  freeFrom,
  freeTo,
  minMinutes = 90,
  horizonDays = 14,
  limit = 3,
}: {
  now: Date;
  freeEvenings: number[]; // days both people said they're usually free
  busyA?: BusyBlock[] | null;
  busyB?: BusyBlock[] | null;
  eveningStartHour?: number;
  eveningEndHour?: number;
  /** "HH:mm". Wins over the hour defaults when set. */
  freeFrom?: string;
  freeTo?: string;
  minMinutes?: number;
  horizonDays?: number;
  limit?: number;
}): Slot[] {
  const busy = mergeBusy([...(busyA ?? []), ...(busyB ?? [])]);
  const haveCalendar = busyA !== null || busyB !== null;
  const days = freeEvenings.length > 0 ? new Set(freeEvenings) : null; // null = any day
  const from = freeFrom ?? `${String(eveningStartHour).padStart(2, "0")}:00`;
  const to = freeTo ?? `${String(eveningEndHour).padStart(2, "0")}:00`;

  const out: Slot[] = [];

  for (let i = 1; i <= horizonDays && out.length < limit; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    if (days && !days.has(date.getDay())) continue;

    const windowStart = atClock(date, from);
    const windowEnd = atClock(date, to);

    // Longest uninterrupted stretch of that evening, once conflicts are cut out.
    const gap = longestGap(windowStart, windowEnd, busy);
    if (!gap || gap.end - gap.start < minMinutes * 60_000) continue;

    out.push({
      startsAt: new Date(gap.start).toISOString(),
      endsAt: new Date(gap.end).toISOString(),
      label: labelFor(new Date(gap.start), new Date(gap.end)),
      confident: haveCalendar,
    });
  }

  return out;
}

/** Overlapping and touching blocks collapse into one, sorted by start. */
function mergeBusy(blocks: BusyBlock[]): { start: number; end: number }[] {
  const spans = blocks
    .map((b) => ({ start: new Date(b.start).getTime(), end: new Date(b.end).getTime() }))
    .filter((s) => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start)
    .sort((a, b) => a.start - b.start);

  const merged: { start: number; end: number }[] = [];
  for (const span of spans) {
    const last = merged.at(-1);
    if (last && span.start <= last.end) last.end = Math.max(last.end, span.end);
    else merged.push({ ...span });
  }
  return merged;
}

function longestGap(
  from: Date,
  to: Date,
  busy: { start: number; end: number }[],
): { start: number; end: number } | null {
  const windowStart = from.getTime();
  const windowEnd = to.getTime();
  if (windowEnd <= windowStart) return null;

  let best: { start: number; end: number } | null = null;
  let cursor = windowStart;

  const consider = (start: number, end: number) => {
    if (end <= start) return;
    if (!best || end - start > best.end - best.start) best = { start, end };
  };

  for (const span of busy) {
    if (span.end <= windowStart || span.start >= windowEnd) continue;
    consider(cursor, Math.min(span.start, windowEnd));
    cursor = Math.max(cursor, span.end);
    if (cursor >= windowEnd) break;
  }
  consider(cursor, windowEnd);

  return best;
}

function atClock(date: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map((n) => Number(n));
  const d = new Date(date);
  d.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

/** Later start and earlier end. Falls back to `a` when the windows miss. */
export function overlapWindows(
  aFrom: string,
  aTo: string,
  bFrom: string,
  bTo: string,
): { freeFrom: string; freeTo: string } {
  const start = Math.max(toMinutes(aFrom), toMinutes(bFrom));
  const end = Math.min(toMinutes(aTo), toMinutes(bTo));
  if (end <= start) return { freeFrom: aFrom, freeTo: aTo };
  return { freeFrom: fromMinutes(start), freeTo: fromMinutes(end) };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => Number(n));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function fromMinutes(n: number): string {
  const h = Math.floor(n / 60);
  const m = n % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function labelFor(start: Date, end: Date): string {
  return `${DAY_NAMES[start.getDay()]} the ${ordinal(start.getDate())}, ${clock(start)}–${clock(end)}`;
}

function clock(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const suffix = h < 12 ? "am" : "pm";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12}${suffix}` : `${hour12}:${String(m).padStart(2, "0")}${suffix}`;
}

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}
