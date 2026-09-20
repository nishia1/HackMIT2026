import { NextResponse } from "next/server";
import { parseNow } from "@/lib/now";
import { getString } from "@/server/services/strings";
import { currentUserId } from "@/server/services/session";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const now = parseNow(new URL(request.url).searchParams.get("now"));
  const string = await getString(currentUserId(), id, now);
  if (!string) return NextResponse.json({ error: "no such string" }, { status: 404 });
  return NextResponse.json({ now: now.toISOString(), string });
}
