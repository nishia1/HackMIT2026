import type { Profile, Stamp } from "@/lib/types";

/**
 * TEMPORARY. Delete this file at the hour-3 checkpoint.
 *
 * Dev 1's routes need profiles and stamps before Dev 3's `repo/users.ts` and
 * `services/strings.ts` exist. Rather than wait, they read from here, behind a
 * comment marked SEAM in each route. When the real ones land, delete the SEAM
 * block and this file goes with it.
 *
 * Kept deliberately small — this is scaffolding, not the seed script.
 * `scripts/seed.ts` (Dev 3) is the believable year of history.
 */

export const MOCK_ME_ID = "me";

const profiles = new Map<string, Profile>([
  [
    MOCK_ME_ID,
    {
      interests: ["ramen", "bouldering", "live music", "film photography"],
      budget: "cheap",
      city: "Cambridge, MA",
      freeEvenings: [2, 4, 6], // Tue, Thu, Sat
      freeFrom: "18:00",
      freeTo: "22:00",
    },
  ],
  [
    "maya",
    {
      interests: ["ramen", "pottery", "live music", "long walks"],
      budget: "mid",
      city: "Cambridge, MA",
      freeEvenings: [4, 5, 6],
      freeFrom: "18:00",
      freeTo: "22:00",
    },
  ],
  [
    "jordan",
    {
      interests: ["bouldering", "board games", "coffee"],
      budget: "free",
      city: "Seattle, WA", // different city on purpose — exercises the virtual path
      freeEvenings: [0, 6],
      freeFrom: "18:00",
      freeTo: "22:00",
    },
  ],
]);

export const MOCK_PEOPLE: Record<string, { name: string }> = {
  maya: { name: "Maya" },
  jordan: { name: "Jordan" },
};

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

/** Shared history, keyed by the other person. Maya's is going cold. */
export const MOCK_STAMPS: Record<string, Stamp[]> = {
  maya: [
    {
      eventId: "e_ramen",
      title: "Ramen at 2am",
      emoji: "🍜",
      kind: "food",
      happenedAt: daysAgo(154),
      photoCount: 0,
      photoUrl: null,
      caption: "we waited 40 minutes and it was worth it",
    },
    {
      eventId: "e_pottery",
      title: "Pottery, badly",
      emoji: "🏺",
      kind: "art",
      happenedAt: daysAgo(198),
      photoCount: 0,
      photoUrl: null,
      caption: "mine collapsed",
    },
    {
      eventId: "e_river",
      title: "Walk along the river",
      emoji: "🌊",
      kind: "outdoors",
      happenedAt: daysAgo(221),
      photoCount: 0,
      photoUrl: null,
      caption: null,
    },
    {
      eventId: "e_gig",
      title: "That basement gig",
      emoji: "🎸",
      kind: "music",
      happenedAt: daysAgo(305),
      photoCount: 0,
      photoUrl: null,
      caption: "ears rang for two days",
    },
  ],
  jordan: [
    {
      eventId: "e_climb",
      title: "First V4",
      emoji: "🧗",
      kind: "sport",
      happenedAt: daysAgo(96),
      photoCount: 0,
      photoUrl: null,
      caption: "took him eleven tries",
    },
    {
      eventId: "e_catan",
      title: "Catan, four hours",
      emoji: "🎲",
      kind: "games",
      happenedAt: daysAgo(140),
      photoCount: 0,
      photoUrl: null,
      caption: null,
    },
  ],
};

export function getMockProfile(userId: string): Profile {
  return (
    profiles.get(userId) ?? {
      interests: [],
      budget: "cheap",
      city: null,
      freeEvenings: [],
      freeFrom: "18:00",
      freeTo: "22:00",
    }
  );
}

/** In-memory, so it survives navigation but not a server restart. Fine for now. */
export function setMockProfile(userId: string, profile: Profile): Profile {
  profiles.set(userId, profile);
  return profile;
}
