import { NextResponse } from "next/server";
import { parseNow } from "@/lib/now";
import { getNudges, getStrings } from "@/server/services/strings";
import { currentUserId } from "@/server/services/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const now = parseNow(new URL(request.url).searchParams.get("now"));
  const meId = currentUserId();
  const [strings, nudges] = await Promise.all([
    getStrings(meId, now),
    getNudges(meId, now),
  ]);
  return NextResponse.json({ now: now.toISOString(), strings, nudges });
}
