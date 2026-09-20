import { NextResponse } from "next/server";
import { stampsFor } from "@/server/services/events";

/** Every photo from every event this person was tagged in, newest first. */

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    return NextResponse.json({ stamps: await stampsFor(id) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not read photos";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
