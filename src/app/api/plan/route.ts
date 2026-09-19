import { NextResponse } from "next/server";
import { planMeetup } from "@/server/services/planner";
import { MOCK_ME_ID, MOCK_PEOPLE, MOCK_STAMPS, getMockProfile } from "@/data/mock";

/**
 * POST /api/plan  { personId, now? }  →  { plans, constraints, source }
 *
 * Thin on purpose: load, call one service, return. If this grows past about
 * fifteen lines of logic, the logic belongs in `services/planner.ts`.
 */

export async function POST(req: Request) {
  let body: { personId?: string; now?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "expected a JSON body" }, { status: 400 });
  }

  const personId = body.personId?.trim();
  if (!personId) {
    return NextResponse.json({ error: "personId is required" }, { status: 400 });
  }

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

  const me = { name: "You", profile: getMockProfile(MOCK_ME_ID) };
  const them = { personId, name: person.name, profile: getMockProfile(personId) };
  const stamps = MOCK_STAMPS[personId] ?? [];
  // ---- END SEAM --------------------------------------------------------

  const result = await planMeetup({ me, them, stamps, now });

  return NextResponse.json({
    personId,
    name: person.name,
    ...result,
    // Send the stamps back so the client can render "because …" without a
    // second round trip.
    stamps: stamps.map((s) => ({ eventId: s.eventId, title: s.title, emoji: s.emoji })),
  });
}
