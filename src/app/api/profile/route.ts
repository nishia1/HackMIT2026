import { NextResponse } from "next/server";
import type { Budget, ConnectedApps, FreeWindow, Profile } from "@/lib/types";
import { getDb } from "@/server/db/client";

/**
 * GET  /api/profile  →  Profile
 * PUT  /api/profile  {...Profile}  →  Profile
 *
 * The planner is only as good as this, so the PUT validates rather than
 * trusting the client: a bad budget string would silently widen someone's
 * spending ceiling, which is the one thing the matcher must never get wrong.
 *
 * Auth is disabled for now (see src/auth.ts), so there's no session to key
 * on — everyone reads/writes the one demo profile below. `getDb()` returning
 * null (Mongo unset or unreachable) falls back to an in-memory copy instead
 * of 500ing, same idea as the rest of the app's demo-world fallback.
 *
 * Both directions go through the same whitelist: anything not listed in
 * `Profile` is dropped, which is why a new field has to be added here before
 * it will save. Profiles stored before per-day windows existed
 * (freeEvenings/freeFrom/freeTo) are converted on read.
 */

const BUDGETS: Budget[] = ["free", "cheap", "mid", "splurge"];
const APP_IDS = ["spotify", "beli", "instagram"] as const;

const EMPTY: Profile = {
  interests: [],
  budget: "cheap",
  city: null,
  freeWindows: [],
  connectedApps: {},
};

const LEGACY_FROM = "18:00";
const LEGACY_TO = "22:00";
const DEMO_EMAIL = "you@example.com";
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;
const HANDLE_RE = /^[A-Za-z0-9._-]{2,30}$/;

// Kept on globalThis so dev hot-reloads don't wipe the in-memory fallback.
const g = globalThis as typeof globalThis & { __demoProfile?: Profile };

export async function GET() {
  const db = await getDb().catch(() => null);
  if (!db) return NextResponse.json(fromStored(g.__demoProfile));
  const user = await db.collection("users").findOne({ email: DEMO_EMAIL });
  return NextResponse.json(fromStored(user?.profile));
}

export async function PUT(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "expected a JSON body" }, { status: 400 });
  }

  const parsed = parseProfile(body);
  if ("error" in parsed) return NextResponse.json(parsed, { status: 400 });

  const db = await getDb().catch(() => null);
  if (!db) {
    g.__demoProfile = parsed.profile;
    return NextResponse.json(parsed.profile);
  }

  await db
    .collection("users")
    .updateOne({ email: DEMO_EMAIL }, { $set: { profile: parsed.profile } }, { upsert: true });
  return NextResponse.json(parsed.profile);
}

/** Strict: used for incoming writes. Rejects a bad budget outright. */
function parseProfile(input: unknown): { profile: Profile } | { error: string } {
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

/** Lenient: used for reads, so an old or partial stored profile still loads. */
function fromStored(stored: unknown): Profile {
  if (typeof stored !== "object" || stored === null) return EMPTY;
  const s = stored as Record<string, unknown>;

  return {
    interests: Array.isArray(s.interests) ? s.interests.filter(isNonEmptyString) : [],
    budget: BUDGETS.includes(s.budget as Budget) ? (s.budget as Budget) : EMPTY.budget,
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