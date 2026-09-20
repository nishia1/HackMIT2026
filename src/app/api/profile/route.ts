import { NextResponse } from "next/server";
import type { Budget, Profile } from "@/lib/types";
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
 */

const BUDGETS: Budget[] = ["free", "cheap", "mid", "splurge"];
const EMPTY: Profile = { interests: [], budget: "cheap", city: null, freeEvenings: [] };
const DEMO_EMAIL = "you@example.com";

let memoryProfile: Profile | null = null;

export async function GET() {
  const db = await getDb().catch(() => null);
  if (!db) return NextResponse.json(memoryProfile ?? EMPTY);
  const user = await db.collection("users").findOne({ email: DEMO_EMAIL });
  return NextResponse.json((user?.profile as Profile | undefined) ?? EMPTY);
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
    memoryProfile = parsed.profile;
    return NextResponse.json(parsed.profile);
  }

  await db
    .collection("users")
    .updateOne({ email: DEMO_EMAIL }, { $set: { profile: parsed.profile } }, { upsert: true });
  return NextResponse.json(parsed.profile);
}

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

  const freeEvenings = Array.isArray(b.freeEvenings)
    ? [...new Set(b.freeEvenings.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))]
    : [];

  const city = isNonEmptyString(b.city) ? b.city.trim().slice(0, 80) : null;

  return { profile: { interests, budget, city, freeEvenings } };
}

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;
