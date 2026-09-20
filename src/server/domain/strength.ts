import type { EventDoc } from "@/lib/types";

/**
 * STRENGTH
 *
 * Pure. No database, no fetch, no Date.now() — `now` is always an argument,
 * which is what makes `?now=2026-12-31` time travel free and makes this file
 * testable before the database exists.
 *
 * Two independent channels come out of it:
 *
 *   depth  = how much shared history exists   → stroke width
 *   warmth = how much of it is still recent   → colour
 *
 * A thick grey rope means "this mattered and you're losing it", which is the
 * screen the whole app exists to produce.
 */

export type EventFacts = {
  happenedAt: string;
  photoCount: number;
  caption: boolean;
  attendeeCount: number;
};

/** Half-life dressed as an exponential: τ = 90 days. */
export const decay = (days: number) => Math.exp(-days / 90);

export const daysBetween = (happenedAt: string, now: Date) =>
  Math.max(0, (now.getTime() - new Date(happenedAt).getTime()) / 86_400_000);

export function weight(e: EventFacts): number {
  return (
    1.0 +
    (e.photoCount > 0 ? 0.3 : 0) +
    (e.caption ? 0.2 : 0) +
    // A 2-person dinner says more than a 50-person party.
    1 / Math.log2(e.attendeeCount + 2)
  );
}

export function factsOf(event: EventDoc): EventFacts {
  return {
    happenedAt: event.happenedAt,
    photoCount: event.memories.length,
    caption: event.memories.some((m) => Boolean(m.caption)),
    attendeeCount: event.attendeeIds.length,
  };
}

export type Strength = {
  depth: number;
  warmth: number;
  eventCount: number;
  lastSeenAt: string | null;
};

export function strengthOf(events: EventDoc[], now: Date): Strength {
  let depth = 0;
  let decayed = 0;
  let lastSeenAt: string | null = null;

  for (const event of events) {
    const w = weight(factsOf(event));
    depth += w;
    decayed += w * decay(daysBetween(event.happenedAt, now));
    if (!lastSeenAt || event.happenedAt > lastSeenAt) lastSeenAt = event.happenedAt;
  }

  return {
    depth,
    warmth: depth === 0 ? 0 : decayed / depth,
    eventCount: events.length,
    lastSeenAt,
  };
}
