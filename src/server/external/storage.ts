import {
  accessToken,
  isConfigured,
  listFolder,
  temporaryLinks,
  thumbnail,
} from "@/server/external/dropbox";
import { fixtureRoll } from "@/server/external/fixtureRoll";
import type { PhotoMeta } from "@/server/domain/cluster";

/**
 * The seam every photo read goes through. Nothing above this file knows the
 * word "Dropbox" — so a dead OAuth token at hour nine is a one-line switch,
 * not a rewrite, and the demo still runs on the fixture roll either way.
 */

export type PhotoSource = {
  kind: "dropbox" | "fixture";
  /** Metadata for the whole roll. No image bytes cross this line. */
  list(): Promise<PhotoMeta[]>;
  /** Short-lived viewable URLs for a handful of paths. Never persist these. */
  links(paths: string[]): Promise<string[]>;
  /** JPEG bytes for one path, transcoded — the form a browser can actually show. */
  thumbnail(path: string): Promise<ArrayBuffer>;
};

const FOLDER = process.env.DROPBOX_CAMERA_FOLDER ?? "/Camera Uploads";

function dropboxSource(): PhotoSource {
  return {
    kind: "dropbox",
    list: async () => listFolder(await accessToken(), FOLDER),
    links: async (paths) => temporaryLinks(await accessToken(), paths),
    thumbnail: async (path) => thumbnail(await accessToken(), path),
  };
}

function fixtureSource(): PhotoSource {
  return {
    kind: "fixture",
    list: async () => fixtureRoll(),
    links: async () => [],
    thumbnail: async () => {
      throw new Error("The sample roll has no image files — link Dropbox to see photos");
    },
  };
}

export function photoSource(): PhotoSource {
  return isConfigured() ? dropboxSource() : fixtureSource();
}
