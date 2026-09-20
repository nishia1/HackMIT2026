import { NextResponse } from "next/server";
import { confirmEvents, type ConfirmedEvent } from "@/server/services/events";
import { eventsFor } from "@/server/repo/events";
import { withUser } from "@/server/services/respond";

/**
 * The write the whole import funnels into. Until this runs, a candidate is
 * something we guessed; after it, it is something you said happened.
 */

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { events?: ConfirmedEvent[] } | null;
  const incoming = body?.events;

  if (!Array.isArray(incoming) || incoming.length === 0) {
    return NextResponse.json({ error: "No events to save" }, { status: 400 });
  }

  return withUser((userId) => confirmEvents(userId, incoming));
}

/** Your own history. Never anyone else's. */
export async function GET() {
  return withUser(async (userId) => ({ events: await eventsFor(userId) }));
}
