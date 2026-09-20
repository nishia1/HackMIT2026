import { getDiscoveries } from "@/server/services/strings";
import { withUser } from "@/server/services/respond";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? 12);
  return withUser(async (meId) => ({
    people: await getDiscoveries(meId, Number.isFinite(limit) ? limit : 12),
  }));
}
