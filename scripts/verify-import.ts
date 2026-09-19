/**
 * Checks the camera-roll clustering without a Dropbox account or the app.
 *
 * Run it after you touch cluster.ts or the gap constant — a wrong gap is
 * invisible in the UI (you just get "we found 40 events" and shrug) and
 * obvious here.
 *
 *   npm run verify:import
 */
import { clusterByGap, samplePhotos } from "../src/server/domain/cluster";
import { templateLabel } from "../src/server/domain/label";
import { fixtureRoll } from "../src/server/external/fixtureRoll";

let failures = 0;

function assert(ok: boolean, what: string) {
  console.log(`${ok ? "ok  " : "FAIL"}  ${what}`);
  if (!ok) failures++;
}

const photos = fixtureRoll();
const clusters = clusterByGap(photos, 6);

console.log(`\n${photos.length} photos → ${clusters.length} events\n`);
for (const c of clusters) {
  const { title, kind } = templateLabel(c);
  console.log(
    `${new Date(c.startsAt).toISOString().slice(0, 10)}  ` +
      `${String(c.photos.length).padStart(3)} photos  ${title} (${kind})`,
  );
}
console.log();

assert(clusters.length >= 10, "finds 10+ events in a year of photos");
assert(
  clusters.every((c) => c.photos.length >= 3),
  "no event is built from fewer than 3 photos",
);
assert(
  clusters.every((c) => +new Date(c.startsAt) <= +new Date(c.endsAt)),
  "every event starts before it ends",
);
assert(
  clusters.every((c, i) => i === 0 || +new Date(c.startsAt) > +new Date(clusters[i - 1].endsAt)),
  "events do not overlap",
);
assert(
  clusters.every((c) => samplePhotos(c).length === Math.min(3, c.photos.length)),
  "each event yields 3 sample photos for the vision call",
);
assert(
  clusterByGap(photos, 24).length < clusters.length,
  "a wider gap merges events",
);
assert(clusterByGap([], 6).length === 0, "an empty roll produces nothing");

const downloads = clusters.length * 3;
console.log(`\n${downloads} downloads instead of ${photos.length}.\n`);

if (failures > 0) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
