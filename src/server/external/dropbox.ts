import type { PhotoMeta } from "@/server/domain/cluster";
import { findById, setDropboxToken } from "@/server/repo/users";

/**
 * Dropbox, kept deliberately thin: list metadata, and turn a handful of paths
 * into links the vision model can read. Nothing here ever writes to the user's
 * Dropbox — the import path is read-only by construction.
 *
 * Every entry point takes a userId. There is no app-wide Dropbox connection:
 * the credentials belong to the person who granted them, and are read from
 * their own user document.
 */

const API = "https://api.dropboxapi.com/2";
const CONTENT = "https://content.dropboxapi.com/2";
const OAUTH = "https://api.dropboxapi.com/oauth2/token";

const IMAGE = /\.(jpe?g|png|heic|heif|webp|gif)$/i;

type ListEntry = {
  ".tag": string;
  name: string;
  path_lower?: string;
  client_modified?: string;
};

type ListResponse = { entries: ListEntry[]; cursor: string; has_more: boolean };

/** The app's own identity. Not a user's — these grant nothing on their own. */
function appCredentials(): { key: string; secret: string } {
  const key = process.env.DROPBOX_APP_KEY;
  const secret = process.env.DROPBOX_APP_SECRET;
  if (!key || !secret) {
    throw new Error("Dropbox is not set up — DROPBOX_APP_KEY and DROPBOX_APP_SECRET are missing");
  }
  return { key, secret };
}

const basicAuth = () => {
  const { key, secret } = appCredentials();
  return `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`;
};

/**
 * Access tokens last four hours; refresh tokens do not expire. Tokens are
 * cached per user — a single map shared by every user would hand one person's
 * Dropbox to the next request on the same serverless instance.
 */
const cache = new Map<string, { token: string; expiresAt: number }>();

const FRESH_ENOUGH = 60_000;

export async function accessToken(userId: string): Promise<string> {
  const hit = cache.get(userId);
  if (hit && hit.expiresAt > Date.now() + FRESH_ENOUGH) return hit.token;

  const user = await findById(userId);
  const dropbox = user?.dropbox;
  if (!dropbox) throw new Error("Dropbox is not connected");

  const storedExpiry = Date.parse(dropbox.expiresAt);
  if (Number.isFinite(storedExpiry) && storedExpiry > Date.now() + FRESH_ENOUGH) {
    cache.set(userId, { token: dropbox.accessToken, expiresAt: storedExpiry });
    return dropbox.accessToken;
  }

  const res = await fetch(OAUTH, {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: dropbox.refreshToken,
    }),
  });
  if (!res.ok) {
    throw new Error(`Dropbox token refresh failed (${res.status}): ${await res.text()}`);
  }

  const { access_token, expires_in } = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  const expiresAt = Date.now() + expires_in * 1000;

  cache.set(userId, { token: access_token, expiresAt });
  // Written back so a cold instance starts from a live token rather than
  // spending a round trip rediscovering one.
  await setDropboxToken(userId, {
    accessToken: access_token,
    expiresAt: new Date(expiresAt).toISOString(),
  });

  return access_token;
}

/** Has this particular person connected their Dropbox? */
export async function isConnected(userId: string): Promise<boolean> {
  const user = await findById(userId);
  return Boolean(user?.dropbox?.refreshToken);
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

/**
 * The folders directly inside `parent`, for the picker. Nobody's camera roll
 * is reliably at /Camera Uploads — it depends on which app synced it — so the
 * user tells us, once, and we remember.
 */
export async function listFolders(
  token: string,
  parent = "",
): Promise<{ name: string; path: string }[]> {
  const folders: { name: string; path: string }[] = [];
  let page = await call<ListResponse>(token, "/files/list_folder", {
    path: parent,
    recursive: false,
    limit: 1000,
  });

  for (;;) {
    for (const entry of page.entries) {
      if (entry[".tag"] === "folder" && entry.path_lower) {
        folders.push({ name: entry.name, path: entry.path_lower });
      }
    }
    if (!page.has_more) break;
    page = await call<ListResponse>(token, "/files/list_folder/continue", {
      cursor: page.cursor,
    });
  }

  return folders.sort((a, b) => a.name.localeCompare(b.name));
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

/**
 * JPEG bytes, whatever the original was. This is the only way HEIC reaches a
 * browser — Chrome and Firefox cannot decode it, and a phone camera roll is
 * mostly HEIC. Dropbox does the transcode, so we never touch an image codec.
 */
export async function thumbnail(
  token: string,
  path: string,
  size = "w640h480",
): Promise<ArrayBuffer> {
  const res = await fetch(`${CONTENT}/files/get_thumbnail_v2`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Dropbox-API-Arg": JSON.stringify({
        resource: { ".tag": "path", path },
        format: "jpeg",
        size,
        mode: "strict",
      }),
    },
  });
  if (!res.ok) {
    throw new Error(`Dropbox thumbnail failed (${res.status}): ${await res.text()}`);
  }
  return res.arrayBuffer();
}
