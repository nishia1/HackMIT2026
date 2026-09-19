import { NextResponse } from "next/server";
import { findCandidates } from "@/server/services/import";

export const dynamic = "force-dynamic";

/** Read-only: scans the roll and proposes events. Saves nothing. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { gapHours?: number };
  const gapHours = Number(body.gapHours) > 0 ? Number(body.gapHours) : 6;

  try {
    return NextResponse.json(await findCandidates(gapHours));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
