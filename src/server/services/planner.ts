import { constraintsFor, type PlanConstraints } from "@/server/domain/match";
import { aiAvailable, planFor } from "@/server/external/openai";
import {
  candidateNames,
  candidatesForPrompt,
  gatherCandidates,
  NO_CANDIDATES,
  type Candidates,
} from "@/server/services/candidates";
import { fetchBusy } from "@/server/external/calendar";
import { findSlots, overlapWindows } from "@/server/domain/availability";
import type { Plan, Profile, Stamp } from "@/lib/types";

/**
 * THE PLANNER
 *
 * Takes pure data in and returns three plans. It does not touch the database —
 * the route loads, this decides — which is what lets it be tested, and what
 * lets it work before anyone else's repo layer exists.
 *
 * The shape of the thing:
 *
 *   constraints (code)  →  three plans (model)  →  citation check (code)
 *
 * The model sits in the middle and is never trusted at either end. If it cites
 * a memory that doesn't exist, that plan is dropped on the floor. If every plan
 * is dropped, or there's no API key, or the call throws, we fall back to
 * templates and the screen still renders. The user never sees an error here.
 */

export type PlanInput = {
  them: { personId: string; name: string; profile: Profile; accessToken?: string | null };
  me: { name: string; profile: Profile; accessToken?: string | null };
  stamps: Stamp[];
  now?: Date;
};

export type PlanResult = {
  plans: Plan[];
  constraints: PlanConstraints;
  source: "ai" | "template";
  /**
   * The names we offered the model. Worth returning in full rather than as a
   * count: "here are the twelve real places it chose from" is the thing that
   * convinces someone the suggestions aren't invented.
   */
  candidates: { places: string[]; events: string[] };
  /**
   * Real gaps found by intersecting both people's calendars, e.g. "Thursday
   * the 25th, 7–9pm". Empty unless at least one side connected a calendar.
   */
  slots: string[];
};

const namesOf = (c: Candidates) => ({
  places: c.places.map((p) => p.name),
  events: c.events.map((e) => e.name),
});

export async function planMeetup(input: PlanInput): Promise<PlanResult> {
  const now = input.now ?? new Date();
  const constraints = constraintsFor(
    input.me.profile,
    input.them.profile,
    input.stamps,
    now,
  );

  const fallback = (candidates: Candidates, slots: string[] = []): PlanResult => ({
    plans: templatePlans(constraints, input.them.name, candidates),
    constraints,
    source: "template",
    candidates: namesOf(candidates),
    slots,
  });

  // Nothing to cite means nothing to ground a plan in. Templates are honest
  // here in a way the model wouldn't be — it would happily invent a memory.
  if (input.stamps.length === 0 || !aiAvailable()) {
    return fallback(NO_CANDIDATES, await availableSlots(input, constraints, now));
  }

  // Real venues, so "get dinner somewhere" can become a restaurant with a name.
  // Never fatal: no city, a dead Overpass mirror or no key all just mean the
  // model is told to leave `where` null.
  const [candidates, slots] = await Promise.all([
    gatherCandidates(constraints).catch(() => NO_CANDIDATES),
    availableSlots(input, constraints, now),
  ]);
  const hasCandidates = candidates.places.length + candidates.events.length > 0;

  try {
    const { plans } = await planFor({
      theirName: input.them.name,
      constraintsJson: JSON.stringify({ ...constraints, slots }, null, 2),
      stampsJson: JSON.stringify(stampsForPrompt(input.stamps), null, 2),
      candidatesJson: hasCandidates
        ? JSON.stringify(candidatesForPrompt(candidates), null, 2)
        : null,
    });

    const valid = validatePlans(plans, input.stamps, candidateNames(candidates));
    if (valid.length > 0) {
      return {
        plans: valid.slice(0, 3),
        constraints,
        source: "ai",
        candidates: namesOf(candidates),
        slots,
      };
    }
  } catch {
    // Fall through. A dead model is a template, not a 500.
  }

  return fallback(candidates, slots);
}

/**
 * Concrete times, when both people have connected a calendar.
 *
 * Degrades in steps: two calendars gives gaps neither is busy in, one gives
 * their profile evenings minus one person's conflicts, none falls back to the
 * profile evenings alone — which is exactly what the planner did before this
 * existed, so nothing regresses when a token is missing or expired.
 */
async function availableSlots(
  input: PlanInput,
  c: PlanConstraints,
  now: Date,
): Promise<string[]> {
  const theirDays = new Set(input.them.profile.freeWindows.map((w) => w.day));
  const freeEvenings = input.me.profile.freeWindows
    .map((w) => w.day)
    .filter((d) => theirDays.has(d));

  if (!input.me.accessToken && !input.them.accessToken) return [];

  const timeMax = new Date(now.getTime() + 14 * 86_400_000);
  const [busyA, busyB] = await Promise.all([
    fetchBusy({ accessToken: input.me.accessToken, timeMin: now, timeMax }),
    fetchBusy({ accessToken: input.them.accessToken, timeMin: now, timeMax }),
  ]);
  if (busyA === null && busyB === null) return [];

  // Widest window either side keeps on any shared day. Per-day windows exist
  // now, but findSlots still takes one range for all days.
  const mine = input.me.profile.freeWindows.filter((w) => freeEvenings.includes(w.day));
  const theirs = input.them.profile.freeWindows.filter((w) => freeEvenings.includes(w.day));

  const { freeFrom, freeTo } = overlapWindows(
    mine[0]?.from ?? "18:00",
    mine[0]?.to ?? "22:00",
    theirs[0]?.from ?? "18:00",
    theirs[0]?.to ?? "22:00",
  );

  return findSlots({ now, freeEvenings, busyA, busyB, freeFrom, freeTo })
    .filter((s) => s.confident)
    .map((s) => s.label);
}

/**
 * Only what the model needs. Photo URLs would cost tokens and tempt it into
 * describing pictures it can't see.
 */
function stampsForPrompt(stamps: Stamp[]) {
  return stamps
    .slice(0, 12)
    .map((s) => ({
      eventId: s.eventId,
      title: s.title,
      kind: s.kind,
      when: s.happenedAt.slice(0, 10),
      caption: s.caption ?? undefined,
    }));
}

/**
 * A plan is only as good as the memory it points at. Anything citing an id we
 * didn't hand over is a hallucination and gets dropped — silently, because the
 * caller already has three good ones or a template fallback.
 */
export function validatePlans(
  plans: Plan[],
  stamps: Stamp[],
  venues: Set<string> = new Set(),
): Plan[] {
  const known = new Set(stamps.map((s) => s.eventId));
  const seen = new Set<string>();

  return (plans ?? [])
    .filter((p) => {
      if (!p?.what?.trim() || !p?.when?.trim()) return false;
      if (!known.has(p.becauseStampId)) return false;
      // Three plans that all lean on the same memory read as one plan.
      if (seen.has(p.becauseStampId)) return false;
      seen.add(p.becauseStampId);
      return true;
    })
    .map((p) => ({ ...p, where: checkedVenue(p.where, venues) }));
}

/**
 * A made-up restaurant is worse than no restaurant — someone will try to go
 * there. So an unrecognised `where` is dropped rather than the whole plan:
 * the idea and its citation were still good.
 */
function checkedVenue(where: string | null, venues: Set<string>): string | null {
  const name = where?.trim();
  if (!name) return null;
  if (venues.size === 0) return null; // we offered nothing, so it invented this
  return venues.has(name.toLowerCase()) ? name : null;
}

/* ------------------------------------------------------------------ *
 * Templates
 *
 * Not a placeholder — this is the shipping path whenever the model is
 * unavailable, and it has to read as if a person wrote it.
 * ------------------------------------------------------------------ */

const BY_KIND: Record<string, { what: string }> = {
  food: { what: "get dinner somewhere neither of you has been" },
  coffee: { what: "get coffee" },
  drinks: { what: "get a drink after work" },
  outdoors: { what: "walk somewhere with a view" },
  music: { what: "find something live and cheap" },
  sport: { what: "go climbing" },
  study: { what: "work in the same room for an afternoon" },
  travel: { what: "plan a day trip" },
  party: { what: "go to whatever's on this weekend" },
  art: { what: "go to a gallery" },
  games: { what: "play something" },
  call: { what: "get on a call properly, not a text" },
  other: { what: "do the thing you keep saying you'll do" },
};

function templatePlans(
  c: PlanConstraints,
  theirName: string,
  candidates: Candidates = NO_CANDIDATES,
): Plan[] {
  const when = c.evenings[0] ? `${c.evenings[0]} evening` : "sometime this week";
  const alt = c.evenings[1] ? `${c.evenings[1]} evening` : "next weekend";

  const ideas = c.virtual
    ? [
        { what: "get on a call properly, not a text", kind: "call" },
        { what: `watch something at the same time as ${theirName}`, kind: "call" },
        { what: "play something online for an hour", kind: "call" },
      ]
    : [
        { ...(BY_KIND[c.kinds[0]] ?? BY_KIND.other), kind: c.kinds[0] ?? "other" },
        { ...(BY_KIND[c.kinds[1]] ?? BY_KIND.coffee), kind: c.kinds[1] ?? "coffee" },
        c.shared[0]
          ? { what: `do something ${c.shared[0].toLowerCase()}-shaped`, kind: "other" }
          : { ...BY_KIND.outdoors, kind: "outdoors" },
      ];

  const because =
    c.monthsSinceLast === null
      ? `You haven't done anything with ${theirName} yet.`
      : `It's been about ${c.monthsSinceLast} months.`;

  // Templates get real venue names too when we have them — the fallback path
  // is the one that ships whenever the model is down, so it has to be good.
  const used = new Set<string>();
  const venueFor = (kind: string) => {
    const hit = candidates.places.find((p) => p.kind === kind && !used.has(p.name));
    if (hit) used.add(hit.name);
    return hit?.name ?? null;
  };

  return ideas.slice(0, 3).map((idea, i) => ({
    when: i === 0 ? when : i === 1 ? alt : "whenever you're both free",
    what: idea.what,
    where: c.virtual ? null : venueFor(idea.kind),
    because,
    becauseStampId: "",
  }));
}
