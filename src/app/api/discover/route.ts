import { NextResponse } from "next/server";
import { getDiscoveries } from "@/server/services/strings";
import { currentUserId } from "@/server/services/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? 12);
  const people = await getDiscoveries(
    currentUserId(),
    Number.isFinite(limit) ? limit : 12,
  );
  return NextResponse.json({ people });
}
