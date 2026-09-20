import { clusterByGap, samplePhotos, type PhotoMeta } from "@/server/domain/cluster";
import { templateLabel } from "@/server/domain/label";
import { photoSource } from "@/server/external/storage";
import { photoUrl } from "@/lib/photo";

/**
 * Read the roll, cut it into events, hand them back **unsaved**.
 *
 * The user tags who was with them and only then do the events exist. An
 * untagged event belongs to no string, which is the one thing this app is
 * for — so it is never written.
 */

export type Candidate = {
  id: string;
  title: string;
  kind: string;
  startsAt: string;
  endsAt: string;
  photoCount: number;
  /**
   * Up to three previews spread across the event, served through /api/photo —
   * stable URLs, and JPEG even when the roll is HEIC.
   */
  sampleUrls: string[];
  samplePaths: string[];
  /** Every photo in the cluster. These are what get written to the event. */
  photoPaths: string[];
};

export type ImportResult = {
  source: "dropbox" | "fixture";
  photoCount: number;
  candidates: Candidate[];
};

export async function findCandidates(gapHours = 6): Promise<ImportResult> {
  const source = photoSource();
  const photos: PhotoMeta[] = await source.list();
  const clusters = clusterByGap(photos, gapHours);

  const candidates = clusters.map((cluster): Candidate => {
    const samplePaths = samplePhotos(cluster).map((p) => p.path);
    return {
      id: `c_${cluster.startsAt}`,
      ...templateLabel(cluster),
      startsAt: cluster.startsAt,
      endsAt: cluster.endsAt,
      photoCount: cluster.photos.length,
      sampleUrls: source.kind === "dropbox" ? samplePaths.map(photoUrl) : [],
      samplePaths,
      photoPaths: cluster.photos.map((p) => p.path),
    };
  });

  candidates.sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt));
  return { source: source.kind, photoCount: photos.length, candidates };
}
