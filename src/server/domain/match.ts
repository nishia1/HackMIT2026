import type { Budget, Profile, Stamp } from "@/lib/types";

/**
 * TWO PROFILES → THE RULES A PLAN HAS TO OBEY.
 *
 * Pure. No I/O, no Date.now() — `now` comes in as an argument like everywhere
 * else in domain/.
 *
 * This runs *before* the model, on purpose. A budget ceiling enforced in a
 * prompt is a suggestion; a budget ceiling computed here and handed over as a
 * hard number is a constraint. The model gets to be creative inside the box,
 * never about the box.
 */

const BUDGET_ORDER: Budget[] = ["free", "cheap", "mid", "splurge"];

/** The poorer friend wins. One broke person vetoes the expensive dinner. */
export function minBudget(a: Budget, b: Budget): Budget {
  const i = Math.min(BUDGET_ORDER.indexOf(a), BUDGET_ORDER.indexOf(b));
  return BUDGET_ORDER[i < 0 ? 0 : i];
}

export const BUDGET_CEILING: Record<Budget, string> = {
  free: "nothing at all",
  cheap: "under $15 each",
  mid: "under $40 each",
  splurge: "no limit",
};

/**
 * What they actually do together, most-frequent first.
 *
 * This beats stated interests when the two disagree. Someone's profile says
 * "live music" because that's who they'd like to be; eleven coffee stamps say
 * who they are with this particular friend.
 */
export function topKinds(stamps: Stamp[], limit = 3): string[] {
  const counts = new Map<string, number>();
  for (const s of stamps) counts.set(s.kind, (counts.get(s.kind) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([kind]) => kind);
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export type PlanConstraints = {
  budget: Budget;
  budgetCeiling: string;
  shared: string[]; // interests they both listed
  either: string[]; // fallback when there is no overlap
  kinds: string[]; // what they actually already do
  evenings: string[]; // day names they are both free
  city: string | null;
  virtual: boolean; // different cities → it has to work over a call
  monthsSinceLast: number | null;
};

export function constraintsFor(
  a: Profile,
  b: Profile,
  stamps: Stamp[],
  now: Date,
): PlanConstraints {
  const budget = minBudget(a.budget, b.budget);
  const bSet = new Set(b.interests.map(normalize));
  const shared = a.interests.filter((i) => bSet.has(normalize(i)));

  const evenings = a.freeEvenings
    .filter((d) => b.freeEvenings.includes(d))
    .sort((x, y) => x - y)
    .map((d) => DAY_NAMES[d])
    .filter(Boolean);

  // Same city or no city on file at all — we only force virtual when we
  // positively know the two are apart.
  const sameCity =
    a.city && b.city ? normalize(a.city) === normalize(b.city) : true;

  return {
    budget,
    budgetCeiling: BUDGET_CEILING[budget],
    shared,
    either: dedupe([...a.interests, ...b.interests]),
    kinds: topKinds(stamps),
    evenings,
    city: sameCity ? (a.city ?? b.city) : null,
    virtual: !sameCity,
    monthsSinceLast: monthsSinceLast(stamps, now),
  };
}

function monthsSinceLast(stamps: Stamp[], now: Date): number | null {
  if (stamps.length === 0) return null;
  const latest = Math.max(...stamps.map((s) => new Date(s.happenedAt).getTime()));
  return Math.floor((now.getTime() - latest) / (30 * 86_400_000));
}

const normalize = (s: string) => s.trim().toLowerCase();

function dedupe(xs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of xs) {
    const k = normalize(x);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(x.trim());
  }
  return out;
}
