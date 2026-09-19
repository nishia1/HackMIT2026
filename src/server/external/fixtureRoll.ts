import type { PhotoMeta } from "@/server/domain/cluster";

/**
 * A believable year of camera roll, generated from a fixed seed so the import
 * screen is identical on every run. This is what makes the whole track
 * demoable — and buildable — before anyone has linked a Dropbox account.
 */

type Outing = { name: string; daysAgo: number; hour: number; shots: number };

const OUTINGS: Outing[] = [
  { name: "ramen-late", daysAgo: 340, hour: 22, shots: 9 },
  { name: "beach-day", daysAgo: 311, hour: 11, shots: 24 },
  { name: "birthday", daysAgo: 284, hour: 20, shots: 31 },
  { name: "hike-stone-mtn", daysAgo: 250, hour: 9, shots: 17 },
  { name: "concert", daysAgo: 213, hour: 21, shots: 12 },
  // Two days of the same trip — 6 hours apart they are two events, a day apart one.
  { name: "roadtrip-day-1", daysAgo: 180, hour: 8, shots: 26 },
  { name: "roadtrip-day-2", daysAgo: 179, hour: 9, shots: 19 },
  { name: "museum", daysAgo: 148, hour: 14, shots: 8 },
  { name: "hackathon", daysAgo: 121, hour: 19, shots: 22 },
  { name: "farmers-market", daysAgo: 93, hour: 10, shots: 6 },
  { name: "dinner-party", daysAgo: 61, hour: 19, shots: 14 },
  { name: "climbing-gym", daysAgo: 47, hour: 18, shots: 7 },
  { name: "picnic", daysAgo: 26, hour: 13, shots: 11 },
  { name: "new-cafe", daysAgo: 4, hour: 9, shots: 5 },
];

/** A lone screenshot or receipt photo — below the 3-photo floor, so dropped. */
const STRAYS = [33, 104, 199, 266];

const pad = (n: number) => String(n).padStart(2, "0");

function at(now: Date, daysAgo: number, hour: number, minutesIn: number): Date {
  const d = new Date(+now - daysAgo * 86_400_000);
  d.setHours(hour, 0, 0, 0);
  return new Date(+d + minutesIn * 60_000);
}

const nameFor = (d: Date) =>
  `/camera uploads/${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
  `${pad(d.getHours())}.${pad(d.getMinutes())}.${pad(d.getSeconds())}.jpg`;

export function fixtureRoll(now = new Date()): PhotoMeta[] {
  const photos: PhotoMeta[] = [];

  for (const outing of OUTINGS) {
    for (let i = 0; i < outing.shots; i++) {
      // 4 minutes apart plus a deterministic jitter: a real burst, not a metronome.
      const taken = at(now, outing.daysAgo, outing.hour, i * 4 + ((i * 7) % 5));
      photos.push({ path: nameFor(taken), takenAt: taken.toISOString() });
    }
  }

  for (const daysAgo of STRAYS) {
    const taken = at(now, daysAgo, 15, 0);
    photos.push({ path: nameFor(taken), takenAt: taken.toISOString() });
  }

  return photos;
}
