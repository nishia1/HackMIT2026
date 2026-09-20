import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { appDb } from "@/server/db/client";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ connected: false }, { status: 401 });

  const db = await appDb();
  const user = await db.collection("users").findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ connected: false });

  const account = await db.collection("accounts").findOne({
    userId: user._id,
    provider: "google",
  });
  return NextResponse.json({ connected: Boolean(account?.refresh_token || account?.access_token) });
}
