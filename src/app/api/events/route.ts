import { NextResponse } from "next/server";
import { confirmEvents, type ConfirmedEvent } from "@/server/services/events";
import { allEvents } from "@/server/repo/events";

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

  try {
    return NextResponse.json(await confirmEvents(incoming));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save events";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function GET() {
  try {
    return NextResponse.json({ events: await allEvents() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not read events";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
