/**
 * PURE. No I/O, no clock — `gapHours` and the photos are the whole input.
 *
 * A camera roll is already a log of everything that happened to you; the only
 * thing missing is where one thing ends and the next begins. Photos taken
 * within a few hours of each other are one outing, and a run of three or more
 * means something actually happened (a stray shot of a parking sign does not).
 */

export type PhotoMeta = {
  /** Provider path — `/Camera Uploads/2026-03-14 20.11.02.jpg`. */
  path: string;
  takenAt: string; // ISO
};

export type Cluster = {
  photos: PhotoMeta[];
  startsAt: string;
  endsAt: string;
};

export function clusterByGap(photos: PhotoMeta[], gapHours = 6, minPhotos = 3): Cluster[] {
  const sorted = [...photos].sort((a, b) => +new Date(a.takenAt) - +new Date(b.takenAt));
  const out: Cluster[] = [];

  for (const p of sorted) {
    const last = out.at(-1);
    const gap = last ? +new Date(p.takenAt) - +new Date(last.endsAt) : Infinity;
    if (gap > gapHours * 3_600_000) {
      out.push({ photos: [p], startsAt: p.takenAt, endsAt: p.takenAt });
    } else {
      last!.photos.push(p);
      last!.endsAt = p.takenAt;
    }
  }

  return out.filter((c) => c.photos.length >= minPhotos);
}

/**
 * Three photos spread across the cluster, not the first three — the start, the
 * middle and the end of an evening look like different places.
 */
export function samplePhotos(cluster: Cluster, count = 3): PhotoMeta[] {
  const { photos } = cluster;
  if (photos.length <= count) return [...photos];
  const step = (photos.length - 1) / (count - 1);
  return Array.from({ length: count }, (_, i) => photos[Math.round(i * step)]);
}
