import {
  accessToken,
  listFolder,
  listFolders,
  temporaryLinks,
  thumbnail,
} from "@/server/external/dropbox";
import { findById } from "@/server/repo/users";
import type { PhotoMeta } from "@/server/domain/cluster";

/**
 * The seam every photo read goes through. Nothing above this file knows the
 * word "Dropbox" — so a dead OAuth token at hour nine is a one-line switch,
 * not a rewrite.
 *
 * A source is always somebody's. There is no app-wide roll and no sample one:
 * a photo shown to a user came out of that user's own account, or it is not
 * shown at all.
 */

export type PhotoSource = {
  /** Metadata for the whole roll. No image bytes cross this line. */
  list(): Promise<PhotoMeta[]>;
  /** Short-lived viewable URLs for a handful of paths. Never persist these. */
  links(paths: string[]): Promise<string[]>;
  /** JPEG bytes for one path, transcoded — the form a browser can actually show. */
  thumbnail(path: string): Promise<ArrayBuffer>;
};

export class NotConnectedError extends Error {
  constructor(message = "Dropbox is not connected") {
    super(message);
    this.name = "NotConnectedError";
  }
}

export class NoFolderError extends Error {
  constructor(message = "No folder chosen yet") {
    super(message);
    this.name = "NoFolderError";
  }
}

export async function photoSource(userId: string): Promise<PhotoSource> {
  const user = await findById(userId);
  if (!user?.dropbox?.refreshToken) throw new NotConnectedError();

  const folder = user.dropbox.folder;

  return {
    list: async () => {
      if (folder === null) throw new NoFolderError();
      return listFolder(await accessToken(userId), folder);
    },
    links: async (paths) => temporaryLinks(await accessToken(userId), paths),
    thumbnail: async (path) => thumbnail(await accessToken(userId), path),
  };
}

/** The picker's data. Separate from PhotoSource because it runs before one exists. */
export async function foldersFor(
  userId: string,
  parent = "",
): Promise<{ name: string; path: string }[]> {
  return listFolders(await accessToken(userId), parent);
}
