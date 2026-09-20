import { NextResponse } from "next/server";
import { foldersFor } from "@/server/external/storage";
import { setDropboxFolder } from "@/server/repo/users";
import { withUser } from "@/server/services/respond";

export const dynamic = "force-dynamic";

/** The folders to choose from. `parent` empty means the top of the account. */
export async function GET(req: Request) {
  const parent = new URL(req.url).searchParams.get("parent") ?? "";
  return withUser(async (userId) => ({ folders: await foldersFor(userId, parent) }));
}

/** Remember which one holds their camera roll. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { folder?: string } | null;
  const folder = body?.folder;

  if (typeof folder !== "string" || !folder.startsWith("/")) {
    return NextResponse.json({ error: "A folder path is required" }, { status: 400 });
  }

  return withUser(async (userId) => {
    await setDropboxFolder(userId, folder);
    return { folder };
  });
}
