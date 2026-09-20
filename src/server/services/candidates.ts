import { findPlaces, type Place } from "@/server/external/places";
import { findEvents, type EventIdea } from "@/server/external/events";
import type { PlanConstraints } from "@/server/domain/match";

/**
 * REAL THINGS THE PLAN CAN POINT AT.
 *
 * Gathers named places and events that fit the constraints, so the planner
 * can say "Santouka" instead of "a ramen place". Both sources run in parallel
 * and neither is allowed to fail the request — a plan with no venue is a
 * slightly worse plan; a 500 is no plan at all.
 */

export type Candidates = { places: Place[]; events: EventIdea[] };

export const NO_CANDIDATES: Candidates = { places: [], events: [] };

export async function gatherCandidates(c: PlanConstraints): Promise<Candidates> {
  // Different cities means there is nowhere they can both be. Suggesting a bar
  // in one of their two cities is worse than suggesting nothing.
  if (c.virtual || !c.city) return NO_CANDIDATES;

  // Shared interests first, then anything either of them likes.
  const interests = c.shared.length > 0 ? [...c.shared, ...c.either] : c.either;

  const [places, events] = await Promise.all([
    findPlaces({ city: c.city, interests, kinds: c.kinds, budget: c.budget }).catch(
      () => [] as Place[],
    ),
    findEvents({ city: c.city, interests, budget: c.budget }).catch(() => [] as EventIdea[]),
  ]);

  return { places, events };
}

/** Compact enough not to dominate the prompt. Names are what matter. */
export function candidatesForPrompt({ places, events }: Candidates) {
  return {
    places: places.slice(0, 10).map((p) => ({
      name: p.name,
      kind: p.kind,
      // What it actually serves. Without this the model happily writes
      // "grab ramen at Romanza Pizzaria" — both are just kind "food".
      serves: p.detail ?? undefined,
      area: p.area ?? undefined,
      price: p.priceHint,
    })),
    events: events.slice(0, 6).map((e) => ({
      name: e.name,
      kind: e.kind,
      when: e.when?.slice(0, 10) ?? "recurring",
      venue: e.venue ?? undefined,
      price: e.priceHint,
    })),
  };
}

/**
 * Every name we handed the model. The planner checks `where` against this —
 * a venue we didn't supply is a hallucinated venue, and a wrong restaurant
 * name is worse than none, because someone will turn up at it.
 */
export function candidateNames({ places, events }: Candidates): Set<string> {
  const names = new Set<string>();
  for (const p of places) names.add(p.name.toLowerCase());
  for (const e of events) {
    names.add(e.name.toLowerCase());
    if (e.venue) names.add(e.venue.toLowerCase());
  }
  return names;
}
