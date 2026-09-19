import type { PhotoMeta } from "@/server/domain/cluster";

/**
 * Dropbox, kept deliberately thin: list metadata, and turn a handful of paths
 * into links the vision model can read. Nothing here ever writes to the user's
 * Dropbox — the import path is read-only by construction.
 */

const API = "https://api.dropboxapi.com/2";

const IMAGE = /\.(jpe?g|png|heic|heif|webp|gif)$/i;

type ListEntry = {
  ".tag": string;
  name: string;
  path_lower?: string;
  client_modified?: string;
};

type ListResponse = { entries: ListEntry[]; cursor: string; has_more: boolean };

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
