import { appDb } from "@/server/db/client";

type GoogleAccount = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
};

/** Returns a usable per-user Calendar token, refreshing it when necessary. */
export async function calendarTokenFor(email: string): Promise<string | null> {
  const db = await appDb();
  const user = await db.collection("users").findOne({ email });
  if (!user) return null;

  const account = (await db.collection("accounts").findOne({
    userId: user._id,
    provider: "google",
  })) as GoogleAccount | null;
  if (!account?.access_token) return null;

  if (!account.expires_at || account.expires_at * 1000 > Date.now() + 60_000) {
    return account.access_token;
  }
  if (!account.refresh_token) return null;

  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: account.refresh_token,
      }),
    });
    if (!res.ok) return null;
    const refreshed = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
    };
    if (!refreshed.access_token) return null;

    await db.collection("accounts").updateOne(
      { userId: user._id, provider: "google" },
      {
        $set: {
          access_token: refreshed.access_token,
          expires_at: Math.floor(Date.now() / 1000) + (refreshed.expires_in ?? 3600),
          ...(refreshed.refresh_token ? { refresh_token: refreshed.refresh_token } : {}),
        },
      },
    );
    return refreshed.access_token;
  } catch {
    return null;
  }
}
