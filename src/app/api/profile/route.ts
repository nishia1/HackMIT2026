import { NextResponse } from "next/server";
import type { Budget, Profile } from "@/lib/types";
import { auth } from "@/auth";
import { appDb } from "@/server/db/client";

/**
 * GET  /api/profile  →  Profile
 * PUT  /api/profile  {...Profile}  →  Profile
 *
 * The planner is only as good as this, so the PUT validates rather than
 * trusting the client: a bad budget string would silently widen someone's
 * spending ceiling, which is the one thing the matcher must never get wrong.
 */

const BUDGETS: Budget[] = ["free", "cheap", "mid", "splurge"];
const EMPTY: Profile = { interests: [], budget: "cheap", city: null, freeEvenings: [] };

export async function GET() {
  const email = await signedInEmail();
  if (!email) return NextResponse.json({ error: "sign in required" }, { status: 401 });
  const db = await appDb();
  const user = await db.collection("users").findOne({ email });
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

  const email = await signedInEmail();
  if (!email) return NextResponse.json({ error: "sign in required" }, { status: 401 });
  const db = await appDb();
  const result = await db.collection("users").findOneAndUpdate(
    { email },
    { $set: { profile: parsed.profile } },
    { returnDocument: "after" },
  );
  if (!result) return NextResponse.json({ error: "account not found" }, { status: 404 });
  return NextResponse.json(parsed.profile);
}

async function signedInEmail(): Promise<string | null> {
  const session = await auth();
  return session?.user?.email ?? null;
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
