import type { Budget, ConnectedApps, FreeWindow, Profile } from "@/lib/types";

/**
 * PROFILES, IN AND OUT
 *
 * Two parsers, one whitelist. `parseProfile` is strict and guards writes — a
 * bad budget string would silently widen someone's spending ceiling, which is
 * the one thing the matcher must never get wrong. `profileFromStored` is
 * lenient and guards reads.
 *
 * Reads need their own parser because a row in `users` was not necessarily
 * written by the current schema: profiles predating per-day windows, rows
 * half-written by an experiment, contacts tagged into an event before they
 * ever signed in. Every one of those has fields missing, and the planner does
 * `profile.freeWindows.map(...)` without asking — so a partial profile reaching
 * the domain layer is a TypeError, not a degraded plan.
 *
 * Anything not listed here is dropped, which is why a new field has to be
 * added in this file before it will save.
 */

const BUDGETS: Budget[] = ["free", "cheap", "mid", "splurge"];
const APP_IDS = ["spotify", "beli", "instagram"] as const;

export const EMPTY_PROFILE: Profile = {
  interests: [],
  budget: "cheap",
  city: null,
  freeWindows: [],
  connectedApps: {},
};

const LEGACY_FROM = "18:00";
const LEGACY_TO = "22:00";
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;
const HANDLE_RE = /^[A-Za-z0-9._-]{2,30}$/;

/** Strict: used for incoming writes. Rejects a bad budget outright. */
export function parseProfile(input: unknown): { profile: Profile } | { error: string } {
  if (typeof input !== "object" || input === null) return { error: "expected an object" };
  const b = input as Record<string, unknown>;

  const budget = typeof b.budget === "string" ? (b.budget as Budget) : null;
  if (!budget || !BUDGETS.includes(budget)) {
    return { error: `budget must be one of ${BUDGETS.join(", ")}` };
  }

  const interests = Array.isArray(b.interests)
    ? [...new Set(b.interests.filter(isNonEmptyString).map((s) => s.trim()))].slice(0, 20)
    : [];

  const city = isNonEmptyString(b.city) ? b.city.trim().slice(0, 80) : null;

  const freeWindows = Array.isArray(b.freeWindows) ? parseWindows(b.freeWindows) : [];

  const connectedApps = parseConnectedApps(b.connectedApps);

  return { profile: { interests, budget, city, freeWindows, connectedApps } };
}

/**
 * Lenient: used for reads, so an old or partial stored profile still loads.
 * Always returns every field, so callers can index into it without guarding.
 */
export function profileFromStored(stored: unknown): Profile {
  if (typeof stored !== "object" || stored === null) return EMPTY_PROFILE;
  const s = stored as Record<string, unknown>;

  return {
    interests: Array.isArray(s.interests) ? s.interests.filter(isNonEmptyString) : [],
    budget: BUDGETS.includes(s.budget as Budget) ? (s.budget as Budget) : EMPTY_PROFILE.budget,
    city: isNonEmptyString(s.city) ? s.city : null,
    freeWindows: Array.isArray(s.freeWindows) ? parseWindows(s.freeWindows) : legacyWindows(s),
    connectedApps: parseConnectedApps(s.connectedApps),
  };
}

/**
 * One window per day (last one wins), sorted Sunday to Saturday. Entries that
 * are malformed or end before they start are dropped; the form already blocks
 * saving those, so this is only a backstop.
 */
function parseWindows(input: unknown[]): FreeWindow[] {
  const byDay = new Map<number, FreeWindow>();
  for (const item of input) {
    if (typeof item !== "object" || item === null) continue;
    const w = item as Record<string, unknown>;
    const day = w.day;
    const from = parseTime(w.from);
    const to = parseTime(w.to);
    if (typeof day !== "number" || !Number.isInteger(day) || day < 0 || day > 6) continue;
    if (!from || !to || to <= from) continue;
    byDay.set(day, { day, from, to });
  }
  return [...byDay.values()].sort((a, b) => a.day - b.day);
}

/** Old shape: a list of days sharing one from/to window. */
function legacyWindows(s: Record<string, unknown>): FreeWindow[] {
  const days = Array.isArray(s.freeEvenings)
    ? [...new Set(s.freeEvenings.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))]
    : [];
  const from = parseTime(s.freeFrom) ?? LEGACY_FROM;
  const to = parseTime(s.freeTo) ?? LEGACY_TO;
  return days.sort((a, b) => a - b).map((day) => ({ day, from, to }));
}

function parseConnectedApps(input: unknown): ConnectedApps {
  const out: ConnectedApps = {};
  if (typeof input !== "object" || input === null) return out;
  const raw = input as Record<string, unknown>;
  for (const id of APP_IDS) {
    const v = raw[id];
    if (typeof v !== "string") continue;
    const handle = v.trim().replace(/^@+/, "");
    if (HANDLE_RE.test(handle)) out[id] = handle;
  }
  return out;
}

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

function parseTime(v: unknown): string | null {
  if (typeof v !== "string" || !TIME_RE.test(v)) return null;
  return v.slice(0, 5);
}
