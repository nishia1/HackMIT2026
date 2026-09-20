import { NextResponse } from "next/server";
import { planMeetup } from "@/server/services/planner";
import { MOCK_ME_ID, MOCK_PEOPLE, MOCK_STAMPS, getMockProfile } from "@/data/mock";
import { getDb } from "@/server/db/client";
import { requireUserId } from "@/server/services/session";
import { findById } from "@/server/repo/users";
import type { Profile } from "@/lib/types";

/**
 * POST /api/plan  { personId, now? }  →  { plans, constraints, source }
 *
 * Thin on purpose: load, call one service, return. If this grows past about
 * fifteen lines of logic, the logic belongs in `services/planner.ts`.
 */

export async function POST(req: Request) {
  let body: { personId?: string; now?: string; theirEmail?: string;   profile?: { interests?: string[]; city?: string | null; days?: string[] };
 };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "expected a JSON body" }, { status: 400 });
  }

  const personId = body.personId?.trim();
  if (!personId) {
    return NextResponse.json({ error: "personId is required" }, { status: 400 });
  }

  // Optional, for testing real two-person calendar overlap before the
  // friends/connections concept exists: pass the second signed-in user's
  // email and their real Google Calendar token gets pulled in too.
  const theirEmail = body.theirEmail?.trim().toLowerCase() || null;

  // `?now=` / `now` is the demo's time machine: it lets us show a string that
  // has gone cold without waiting eight months for it to happen.
  const now = body.now ? new Date(body.now) : new Date();
  if (Number.isNaN(now.getTime())) {
    return NextResponse.json({ error: "now is not a valid date" }, { status: 400 });
  }

  // ---- SEAM ------------------------------------------------------------
  // Delete this block at hour 3. Replace with:
  //   const me     = await repo.users.find(session.userId)
  //   const them   = await repo.users.find(personId)
  //   const stamps = (await strings.getOne(session.userId, personId, now)).stamps
  const person = MOCK_PEOPLE[personId];
  if (!person) return NextResponse.json({ error: "no such person" }, { status: 404 });

  // Your real profile, keyed on the signed-in user. Falls back to the mock
  // one only when you haven't filled yours in yet.
  const currentUser = await findById(await requireUserId());
  const meProfile = currentUser?.profile ?? getMockProfile(MOCK_ME_ID);

  // No calendars: Google auth was removed, so nobody has a token and
  // `planner` skips the free/busy lookup entirely (see planner.ts:136).
  const me = {
    name: currentUser?.name ?? "You",
    profile: meProfile,
    accessToken: null,
  };

  const db = await getDb();
  const theirUser = theirEmail
    ? await db.collection("users").findOne({ email: theirEmail })
    : null;

  const them = {
    personId,
    name: theirUser?.name ?? person.name,
    profile: (theirUser?.profile as Profile | undefined) ?? getMockProfile(personId),
    accessToken: null,
  };
  const stamps = MOCK_STAMPS[personId] ?? [];
  // ---- END SEAM --------------------------------------------------------

  // Extra context pasted in the harness. Layered over their saved profile
// for this request only. Nothing is saved.
  const extra = body.profile;
  if (extra) {
    them.profile = {
      ...them.profile,
      interests: [...new Set([...(extra.interests ?? []), ...(them.profile.interests ?? [])])],
      ...(extra.city ? { city: extra.city } : {}),
    };
  }

  const result = await planMeetup({ me, them, stamps, now });

  return NextResponse.json({
    personId,
    name: person.name,
    ...result,
    // Whether each side's real calendar was actually used, so testing two
    // real Google accounts doesn't require reading server logs to confirm.
    // Always false now that Google auth is gone. Kept so the client contract
    // does not change if calendars ever come back.
    calendars: { me: false, them: false },
    // Send the stamps back so the client can render "because …" without a
    // second round trip.
    stamps: stamps.map((s) => ({ eventId: s.eventId, title: s.title, emoji: s.emoji })),
  });
}
