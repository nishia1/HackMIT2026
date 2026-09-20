import { NextResponse } from "next/server";
import { parseProfile, profileFromStored } from "@/server/domain/profile";
import { findById, setProfile } from "@/server/repo/users";
import { withUser } from "@/server/services/respond";

/**
 * GET  /api/profile  →  Profile
 * PUT  /api/profile  {...Profile}  →  Profile
 *
 * The planner is only as good as this, so the PUT validates rather than
 * trusting the client: a bad budget string would silently widen someone's
 * spending ceiling, which is the one thing the matcher must never get wrong.
 *
 * Keyed on the session, like every other read path. This route predated
 * sign-in and used to read and write one hardcoded `you@example.com` row, so
 * filling in the form updated a demo account nobody is signed in as — while
 * the planner matched on your own, still-empty profile and could therefore
 * only ever offer "get coffee".
 *
 * Both parsers live in `server/domain/profile.ts`, because the planner reads
 * stored profiles too and has to get the same leniency this route does.
 */

export async function GET() {
  return withUser(async (userId) => {
    const user = await findById(userId);
    return profileFromStored(user?.profile);
  });
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

  return withUser(async (userId) => {
    await setProfile(userId, parsed.profile);
    return parsed.profile;
  });
}
