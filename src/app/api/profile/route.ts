import { NextResponse } from "next/server";
import type { Budget, Profile } from "@/lib/types";
import { MOCK_ME_ID, getMockProfile, setMockProfile } from "@/data/mock";

/**
 * GET  /api/profile  →  Profile
 * PUT  /api/profile  {...Profile}  →  Profile
 *
 * The planner is only as good as this, so the PUT validates rather than
 * trusting the client: a bad budget string would silently widen someone's
 * spending ceiling, which is the one thing the matcher must never get wrong.
 */

const BUDGETS: Budget[] = ["free", "cheap", "mid", "splurge"];

export async function GET() {
  // ---- SEAM: swap for repo.users.find(session.userId) at hour 3 ----
  return NextResponse.json(getMockProfile(MOCK_ME_ID));
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

  // ---- SEAM: swap for repo.users.setProfile(session.userId, …) ----
  return NextResponse.json(setMockProfile(MOCK_ME_ID, parsed.profile));
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
