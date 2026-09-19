/**
 * THE CONTRACTS
 *
 * The entire integration surface between the three of us. Agreed at hour 0,
 * then frozen — if one of these has to change, say so out loud before you
 * change it, because someone else is already building against it.
 *
 * Nothing in here imports anything. It's types only, safe on both sides.
 */

export type Tier = "alive" | "warm" | "fading" | "cold";

export type Budget = "free" | "cheap" | "mid" | "splurge";

/** One memory, flattened for rendering. Dev 2 produces these. */
export type Stamp = {
  eventId: string;
  title: string; // "Ramen at 2am"
  emoji: string;
  kind: string; // "food" | "hike" | "concert" | ...
  happenedAt: string; // ISO
  photoUrl: string | null;
  caption: string | null;
};

/** Dev 3 → everyone. The shape the whole UI renders. */
export type StringView = {
  personId: string;
  name: string;
  avatarUrl: string | null;
  depth: number; // 0..1 → stroke width 1..6
  warmth: number; // 0..1 → grey → red
  tier: Tier;
  eventCount: number;
  lastSeenAt: string | null;
  stamps: Stamp[];
};

/** Dev 3 owns the schema, Dev 2 writes to it. */
export type EventDoc = {
  _id: string;
  title: string;
  happenedAt: string;
  kind: string;
  groupId: string | null;
  createdBy: string;
  attendeeIds: string[]; // ← this array IS the string
  memories: {
    dropboxPath: string | null;
    thumbUrl: string | null;
    caption: string | null;
    stampTitle: string;
    stampEmoji: string;
    addedBy: string;
  }[];
};

/** Dev 1 owns it. The planner matches against this. */
export type Profile = {
  interests: string[]; // ["bouldering", "ramen", "live music"]
  budget: Budget;
  city: string | null;
  freeEvenings: number[]; // 0=Sun … 6=Sat
};

/** Dev 1 → Dev 2. Vision pass over ~3 sample photos from a cluster. */
export type PhotoLabel = { title: string; kind: string; place: string | null };
export type LabelPhotos = (imageUrls: string[]) => Promise<PhotoLabel>;

/** Dev 1 → Dev 2. One photo + caption becomes a passport stamp. */
export type StampDraft = { stampTitle: string; stampEmoji: string; kind: string };

/** Dev 1 → Dev 3 renders it in NudgeCard. */
export type Plan = {
  when: string; // "Thursday evening"
  what: string; // "ramen at Santouka"
  where: string | null;
  because: string; // one line, grounded in a real memory
  becauseStampId: string; // MUST resolve to a real stamp, or the plan is dropped
};

/** Dev 1 → Dev 2. Six slides of Wrapped copy. */
export type WrappedSlide = { headline: string; line: string };

/** A short list of event kinds the app knows how to talk about. */
export const EVENT_KINDS = [
  "food",
  "coffee",
  "drinks",
  "outdoors",
  "music",
  "sport",
  "study",
  "travel",
  "party",
  "art",
  "games",
  "call",
  "other",
] as const;

export type EventKind = (typeof EVENT_KINDS)[number];
