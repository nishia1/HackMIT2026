import { stampsFor } from "@/server/services/events";
import { withUser } from "@/server/services/respond";

/** Every photo from every event you and this person were both at, newest first. */

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withUser(async (meId) => ({ stamps: await stampsFor(meId, id) }));
}
