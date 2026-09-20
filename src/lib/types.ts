/**
 * THE CONTRACTS
 *
 * The entire integration surface between the three of us. Agreed at hour 0,
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
  kind: string; // "food" | "hike" | "concert" | …
  happenedAt: string; // ISO
  photoUrl: string | null;
  caption: string | null;
};

/** Dev 3 → everyone. The shape the whole UI renders. */
export type StringView = {
  personId: string;
  name: string;
  avatarUrl: string | null;
  /**
   * Σ weight over every shared event — how much history exists. Unbounded in
   * principle, ~8 in practice, which is where the 1..6 stroke width saturates.
   */
  depth: number;
  warmth: number; // 0..1 → grey → red
  tier: Tier;
  eventCount: number;
  lastSeenAt: string | null;
  stamps: Stamp[];
};

export type Memory = {
  /**
   * The durable handle: paths outlive links, tokens and sessions. Null for a
   * memory with no image behind it — the seeded world is captions only — so
   * readers must skip those rather than ask for a photo that was never there.
   */
  dropboxPath: string | null;
  thumbUrl: string | null;
  caption: string | null;
  stampTitle: string;
  stampEmoji: string;
  addedBy: string;
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
  memories: Memory[];
  /** Set by the camera-roll import. Absent on the seeded world. */
  createdAt?: string;
};

/** A memory dressed for display: a viewable src, resolved at read time. */
export type StampView = {
  eventId: string;
  title: string;
  emoji: string;
  kind: string;
  happenedAt: string;
  caption: string | null;
  /** Points at our own /api/photo, which proxies and transcodes on demand. */
  src: string;
};

/** Dev 1 → Dev 2. Vision pass over ~3 sample photos from a cluster. */
export type PhotoLabel = { title: string; kind: string; place: string | null };
export type LabelPhotos = (imageUrls: string[]) => Promise<PhotoLabel>;

/** Dev 1 → Dev 2. One photo + caption becomes a passport stamp. */
export type StampDraft = { stampTitle: string; stampEmoji: string; kind: string };

/** Dev 1 owns it. The planner matches against this. */
export type Profile = {
  interests: string[]; // ["bouldering", "ramen", "live music"]
  budget: Budget;
  city: string | null;
  freeEvenings: number[]; // 0=Sun … 6=Sat
  /** "HH:mm", 24h. Same window applies to every day in `freeEvenings`. */
  freeFrom: string;
  freeTo: string;
};

/** Dev 1 → Dev 3 renders it in NudgeCard. */
export type Plan = {
  when: string; // "Thursday evening"
  what: string; // "ramen at Santouka"
  where: string | null;
  because: string; // one line, grounded in a real memory
  becauseStampId: string; // MUST resolve to a real stamp, or the plan is dropped
};

/** A string worth doing something about. Dev 3 → NudgeCard. */
export type Nudge = {
  personId: string;
  name: string;
  /** depth × (1 − warmth): how much history, times how cold it has gone. */
  losing: number;
  daysSince: number;
  line: string;
  lastStamp: Stamp | null;
};

/** Someone 3–4 degrees out you haven't met. */
export type Discovery = {
  personId: string;
  name: string;
  avatarUrl: string | null;
  degree: number;
  /** How many distinct friend chains reach them. More chains = more real. */
  pathCount: number;
  via: string[]; // names along one example chain, you and them excluded
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