import { parseNow } from "@/lib/now";
import { getNudges, getStrings } from "@/server/services/strings";
import { withUser } from "@/server/services/respond";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const now = parseNow(new URL(request.url).searchParams.get("now"));
  return withUser(async (meId) => {
    const [strings, nudges] = await Promise.all([
      getStrings(meId, now),
      getNudges(meId, now),
    ]);
    return { now: now.toISOString(), strings, nudges };
  });
}
