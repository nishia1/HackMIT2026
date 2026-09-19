import { constraintsFor, type PlanConstraints } from "@/server/domain/match";
import { aiAvailable, planFor } from "@/server/external/openai";
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
  them: { personId: string; name: string; profile: Profile };
  me: { name: string; profile: Profile };
  stamps: Stamp[];
  now?: Date;
};

export type PlanResult = {
  plans: Plan[];
  constraints: PlanConstraints;
  source: "ai" | "template";
};

export async function planMeetup(input: PlanInput): Promise<PlanResult> {
  const now = input.now ?? new Date();
  const constraints = constraintsFor(
    input.me.profile,
    input.them.profile,
    input.stamps,
    now,
  );

  // Nothing to cite means nothing to ground a plan in. Templates are honest
  // here in a way the model wouldn't be — it would happily invent a memory.
  if (input.stamps.length === 0 || !aiAvailable()) {
    return { plans: templatePlans(constraints, input.them.name), constraints, source: "template" };
  }

  try {
    const { plans } = await planFor({
      theirName: input.them.name,
      constraintsJson: JSON.stringify(constraints, null, 2),
      stampsJson: JSON.stringify(stampsForPrompt(input.stamps), null, 2),
    });

    const valid = validatePlans(plans, input.stamps);
    if (valid.length > 0) return { plans: valid.slice(0, 3), constraints, source: "ai" };
  } catch {
    // Fall through. A dead model is a template, not a 500.
  }

  return { plans: templatePlans(constraints, input.them.name), constraints, source: "template" };
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
export function validatePlans(plans: Plan[], stamps: Stamp[]): Plan[] {
  const known = new Set(stamps.map((s) => s.eventId));
  const seen = new Set<string>();

  return (plans ?? []).filter((p) => {
    if (!p?.what?.trim() || !p?.when?.trim()) return false;
    if (!known.has(p.becauseStampId)) return false;
    // Three plans that all lean on the same memory read as one plan.
    if (seen.has(p.becauseStampId)) return false;
    seen.add(p.becauseStampId);
    return true;
  });
}

/* ------------------------------------------------------------------ *
 * Templates
 *
 * Not a placeholder — this is the shipping path whenever the model is
 * unavailable, and it has to read as if a person wrote it.
 * ------------------------------------------------------------------ */

const BY_KIND: Record<string, { what: string; where: string | null }> = {
  food: { what: "get dinner somewhere neither of you has been", where: null },
  coffee: { what: "get coffee", where: null },
  drinks: { what: "get a drink after work", where: null },
  outdoors: { what: "walk somewhere with a view", where: null },
  music: { what: "find something live and cheap", where: null },
  sport: { what: "go climbing", where: null },
  study: { what: "work in the same room for an afternoon", where: null },
  travel: { what: "plan a day trip", where: null },
  party: { what: "go to whatever's on this weekend", where: null },
  art: { what: "go to a gallery", where: null },
  games: { what: "play something", where: null },
  call: { what: "get on a call properly, not a text", where: null },
  other: { what: "do the thing you keep saying you'll do", where: null },
};

function templatePlans(c: PlanConstraints, theirName: string): Plan[] {
  const when = c.evenings[0] ? `${c.evenings[0]} evening` : "sometime this week";
  const alt = c.evenings[1] ? `${c.evenings[1]} evening` : "next weekend";

  const ideas = c.virtual
    ? [
        { what: "get on a call properly, not a text", where: null },
        { what: `watch something at the same time as ${theirName}`, where: null },
        { what: "play something online for an hour", where: null },
      ]
    : [
        BY_KIND[c.kinds[0]] ?? BY_KIND.other,
        BY_KIND[c.kinds[1]] ?? BY_KIND.coffee,
        c.shared[0]
          ? { what: `do something ${c.shared[0].toLowerCase()}-shaped`, where: null }
          : BY_KIND.outdoors,
      ];

  const because =
    c.monthsSinceLast === null
      ? `You haven't done anything with ${theirName} yet.`
      : `It's been about ${c.monthsSinceLast} months.`;

  return ideas.slice(0, 3).map((idea, i) => ({
    when: i === 0 ? when : i === 1 ? alt : "whenever you're both free",
    what: idea.what,
    where: idea.where ?? c.city,
    because,
    becauseStampId: "",
  }));
}
