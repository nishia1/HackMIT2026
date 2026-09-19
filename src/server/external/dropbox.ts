import type { PhotoMeta } from "@/server/domain/cluster";

/**
 * Dropbox, kept deliberately thin: list metadata, and turn a handful of paths
 * into links the vision model can read. Nothing here ever writes to the user's
 * Dropbox — the import path is read-only by construction.
 */

const API = "https://api.dropboxapi.com/2";
const OAUTH = "https://api.dropboxapi.com/oauth2/token";

const IMAGE = /\.(jpe?g|png|heic|heif|webp|gif)$/i;

type ListEntry = {
  ".tag": string;
  name: string;
  path_lower?: string;
  client_modified?: string;
};

type ListResponse = { entries: ListEntry[]; cursor: string; has_more: boolean };

/**
 * Access tokens last four hours, which is shorter than a hackathon. A refresh
 * token plus the app key and secret buys a fresh one on demand; the cached
 * token is kept in module scope so a burst of requests does one exchange.
 */
let cached: { token: string; expiresAt: number } | null = null;

export async function accessToken(): Promise<string> {
  const direct = process.env.DROPBOX_ACCESS_TOKEN;
  if (direct) return direct;

  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
  const key = process.env.DROPBOX_APP_KEY;
  const secret = process.env.DROPBOX_APP_SECRET;
  if (!refreshToken || !key || !secret) {
    throw new Error("Dropbox is not configured");
  }

  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const res = await fetch(OAUTH, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  });
  if (!res.ok) {
    throw new Error(`Dropbox token refresh failed (${res.status}): ${await res.text()}`);
  }

  const { access_token, expires_in } = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  cached = { token: access_token, expiresAt: Date.now() + expires_in * 1000 };
  return access_token;
}

export function isConfigured(): boolean {
  return Boolean(
    process.env.DROPBOX_ACCESS_TOKEN ||
      (process.env.DROPBOX_REFRESH_TOKEN &&
        process.env.DROPBOX_APP_KEY &&
        process.env.DROPBOX_APP_SECRET),
  );
}

async function call<T>(token: string, endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Dropbox ${endpoint} failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as T;
}

/**
 * Metadata only — 2,000 entries a page, following `has_more` until the folder
 * is exhausted. A year of photos is a few hundred kilobytes of JSON and zero
 * image downloads.
 */
export async function listFolder(
  token: string,
  folder: string,
  maxEntries = 20_000,
): Promise<PhotoMeta[]> {
  const photos: PhotoMeta[] = [];
  let page = await call<ListResponse>(token, "/files/list_folder", {
    path: folder,
    recursive: true,
    limit: 2000,
  });

  for (;;) {
    for (const entry of page.entries) {
      if (entry[".tag"] !== "file" || !entry.path_lower || !entry.client_modified) continue;
      if (!IMAGE.test(entry.name)) continue;
      photos.push({ path: entry.path_lower, takenAt: entry.client_modified });
    }
    if (!page.has_more || photos.length >= maxEntries) break;
    page = await call<ListResponse>(token, "/files/list_folder/continue", {
      cursor: page.cursor,
    });
  }

  return photos;
}

/** Temporary links expire after four hours, so callers must not store them. */
export async function temporaryLink(token: string, path: string): Promise<string> {
  const { link } = await call<{ link: string }>(token, "/files/get_temporary_link", { path });
  return link;
}

export async function temporaryLinks(token: string, paths: string[]): Promise<string[]> {
  const links = await Promise.allSettled(paths.map((p) => temporaryLink(token, p)));
  return links.flatMap((l) => (l.status === "fulfilled" ? [l.value] : []));
}
