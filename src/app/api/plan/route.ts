import { NextResponse } from "next/server";
import { planMeetup } from "@/server/services/planner";
import { MOCK_ME_ID, MOCK_PEOPLE, MOCK_STAMPS, getMockProfile } from "@/data/mock";
import { getDb } from "@/server/db/client";
import { requireUserId } from "@/server/services/session";
import { findById } from "@/server/repo/users";
import { getString } from "@/server/services/strings";
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

  const meId = await requireUserId();

  /**
   * A real connection of yours, or — for the two ids the /plan harness
   * offers — the mock pair it was built on. The mock path is kept so that
   * harness keeps working; everything reached from the app is real.
   */
  const [currentUser, theirUser, string] = await Promise.all([
    findById(meId),
    findById(personId),
    getString(meId, personId, now),
  ]);

  const mockPerson = MOCK_PEOPLE[personId];
  if (!theirUser && !mockPerson) {
    return NextResponse.json({ error: "no such person" }, { status: 404 });
  }

  // No calendars: Google auth was removed, so nobody has a token and
  // `planner` skips the free/busy lookup entirely (see planner.ts:136).
  const me = {
    // Falls back to the mock profile only when you haven't filled yours in.
    name: currentUser?.name ?? "You",
    profile: currentUser?.profile ?? getMockProfile(MOCK_ME_ID),
    accessToken: null,
  };

  // Still supported for testing two real accounts' overlap by email.
  const db = await getDb();
  const byEmail = theirEmail
    ? await db.collection("users").findOne({ email: theirEmail })
    : null;

  const them = {
    personId,
    name: byEmail?.name ?? theirUser?.name ?? mockPerson!.name,
    profile:
      (byEmail?.profile as Profile | undefined) ??
      theirUser?.profile ??
      getMockProfile(personId),
    accessToken: null,
  };

  /**
   * What the plan is allowed to cite. Real shared history when there is any
   * — the planner drops a plan whose `becauseStampId` doesn't resolve, so
   * these have to be the stamps that actually exist on this string.
   */
  const stamps = string?.stamps.length ? string.stamps : (MOCK_STAMPS[personId] ?? []);

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
    name: them.name,
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
