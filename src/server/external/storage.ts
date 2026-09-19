import { listFolder, temporaryLinks } from "@/server/external/dropbox";
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
};

const FOLDER = process.env.DROPBOX_CAMERA_FOLDER ?? "/Camera Uploads";

function dropboxSource(token: string): PhotoSource {
  return {
    kind: "dropbox",
    list: () => listFolder(token, FOLDER),
    links: (paths) => temporaryLinks(token, paths),
  };
}

function fixtureSource(): PhotoSource {
  return {
    kind: "fixture",
    list: async () => fixtureRoll(),
    links: async () => [],
  };
}

export function photoSource(): PhotoSource {
  const token = process.env.DROPBOX_ACCESS_TOKEN;
  return token ? dropboxSource(token) : fixtureSource();
}
