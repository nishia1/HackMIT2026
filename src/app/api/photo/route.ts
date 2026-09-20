import { NextResponse } from "next/server";
import { photoSource } from "@/server/external/storage";

/**
 * `/api/photo?path=/hackmit/img_3990.heic` → JPEG bytes.
 *
 * Every photo in the app is referenced through here, which buys two things a
 * raw Dropbox link cannot: the URL never expires, so it is safe to store and
 * safe to put in an `<img src>` a week from now; and HEIC arrives as JPEG,
 * which is the only form Chrome will render.
 */

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const path = new URL(req.url).searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }

  try {
    const bytes = await photoSource().thumbnail(path);
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
