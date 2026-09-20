import { NextResponse } from "next/server";
import { aiAvailable, extractInterests } from "@/server/external/openai";

/**
 * POST /api/profile/extract  { text }  →  { interests: string[] }
 *
 * Does not save anything. The user reviews the chips and hits save — pulling
 * interests out of a paste is a guess, and a guess shouldn't silently become
 * part of someone's profile.
 */

export async function POST(req: Request) {
  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "expected a JSON body" }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) return NextResponse.json({ error: "paste something first" }, { status: 400 });
  if (!aiAvailable()) {
    return NextResponse.json(
      { error: "no OPENAI_API_KEY set, so this can't read your paste yet" },
      { status: 503 },
    );
  }

  try {
    const { interests } = await extractInterests(text);
    return NextResponse.json({
      interests: interests.map((i) => i.trim()).filter(Boolean).slice(0, 10),
    });
  } catch {
    return NextResponse.json({ error: "couldn't read that — try adding them by hand" }, { status: 502 });
  }
}
