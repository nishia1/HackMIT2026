import { findCandidates } from "@/server/services/import";
import { withUser } from "@/server/services/respond";

export const dynamic = "force-dynamic";

/** Read-only: scans your roll and proposes events. Saves nothing. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { gapHours?: number };
  const gapHours = Number(body.gapHours) > 0 ? Number(body.gapHours) : 6;

  return withUser((userId) => findCandidates(userId, gapHours));
}
