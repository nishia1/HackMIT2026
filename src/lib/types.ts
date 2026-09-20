/**
 * THE FROZEN CONTRACTS
 *
 * The entire integration surface between the three of us. Everything else is
 * an implementation detail; these shapes are not.
 */

export type Tier = "alive" | "warm" | "fading" | "cold";

/** One photo, as the database remembers it. */
export type Memory = {
  /**
   * The durable handle. Dropbox paths outlive links, tokens and sessions, so
   * this — never a URL — is what gets written down.
   */
  dropboxPath: string;
  caption: string | null;
  stampTitle: string;
  stampEmoji: string;
  addedBy: string;
};

export type EventDoc = {
  _id: string;
  title: string;
  happenedAt: string; // ISO
  kind: string;
  groupId: string | null;
  createdBy: string;
  /** This array IS the string. Two people are connected by appearing here. */
  attendeeIds: string[];
  memories: Memory[];
  createdAt: string;
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
