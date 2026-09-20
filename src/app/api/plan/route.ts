import { NextResponse } from "next/server";
import { planMeetup } from "@/server/services/planner";
import { MOCK_ME_ID, MOCK_PEOPLE, MOCK_STAMPS, getMockProfile } from "@/data/mock";
import { auth } from "@/auth";
import { appDb } from "@/server/db/client";
import { calendarTokenFor } from "@/server/external/google-auth";
import type { Profile } from "@/lib/types";

/**
 * POST /api/plan  { personId, now? }  →  { plans, constraints, source }
 *
 * Thin on purpose: load, call one service, return. If this grows past about
 * fifteen lines of logic, the logic belongs in `services/planner.ts`.
 */

export async function POST(req: Request) {
  let body: { personId?: string; now?: string; theirEmail?: string };
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

  const session = await auth();
  const email = session?.user?.email ?? null;
  const db = await appDb();
  const currentUser = email ? await db.collection("users").findOne({ email }) : null;
  const meProfile = (currentUser?.profile as Profile | undefined) ?? getMockProfile(MOCK_ME_ID);
  const myCalendarToken = email ? await calendarTokenFor(email) : null;

  const me = {
    name: session?.user?.name ?? "You",
    profile: meProfile,
    accessToken: myCalendarToken,
  };
  const theirUser = theirEmail ? await db.collection("users").findOne({ email: theirEmail }) : null;
  const theirCalendarToken = theirEmail ? await calendarTokenFor(theirEmail) : null;

  const them = {
    personId,
    name: theirUser?.name ?? person.name,
    profile: (theirUser?.profile as Profile | undefined) ?? getMockProfile(personId),
    accessToken: theirCalendarToken,
  };
  const stamps = MOCK_STAMPS[personId] ?? [];
  // ---- END SEAM --------------------------------------------------------

  const result = await planMeetup({ me, them, stamps, now });

  return NextResponse.json({
    personId,
    name: person.name,
    ...result,
    // Whether each side's real calendar was actually used, so testing two
    // real Google accounts doesn't require reading server logs to confirm.
    calendars: { me: Boolean(myCalendarToken), them: Boolean(theirCalendarToken) },
    // Send the stamps back so the client can render "because …" without a
    // second round trip.
    stamps: stamps.map((s) => ({ eventId: s.eventId, title: s.title, emoji: s.emoji })),
  });
}
