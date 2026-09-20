import { NextResponse } from "next/server";
import { photoSource } from "@/server/external/storage";
import { requireUserId } from "@/server/services/session";
import { getDb } from "@/server/db/client";
import { COLLECTIONS } from "@/server/db/schema";
import type { EventDoc } from "@/lib/types";

/**
 * `/api/photo?path=/camera/img_3990.heic&owner=u_1a2b` → JPEG bytes.
 *
 * Every photo in the app is referenced through here, which buys two things a
 * raw Dropbox link cannot: the URL never expires, so it is safe to store and
 * safe to put in an `<img src>` a week from now; and HEIC arrives as JPEG,
 * which is the only form Chrome will render.
 *
 * Fetching from someone else's Dropbox is allowed for exactly one reason —
 * you were both at the event the photo belongs to. That is checked here,
 * against the event itself, not taken on the caller's word.
 */

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");
  const owner = searchParams.get("owner");

  if (!path || !owner) {
    return NextResponse.json({ error: "path and owner are required" }, { status: 400 });
  }

  let meId: string;
  try {
    meId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (owner !== meId && !(await sharedEvent(meId, owner, path))) {
    return NextResponse.json({ error: "Not your photo" }, { status: 403 });
  }

  try {
    const bytes = await (await photoSource(owner)).thumbnail(path);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "image/jpeg",
        // Private: these are the user's photos, so no shared/CDN caching.
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Photo unavailable";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/** Is there an event you both attended that actually contains this photo? */
async function sharedEvent(meId: string, owner: string, path: string): Promise<boolean> {
  const db = await getDb();
  const hit = await db.collection<EventDoc>(COLLECTIONS.events).findOne(
    {
      attendeeIds: { $all: [meId, owner] },
      memories: { $elemMatch: { dropboxPath: path, addedBy: owner } },
    },
    { projection: { _id: 1 } },
  );
  return hit !== null;
}
