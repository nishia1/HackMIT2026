import type { Db } from "mongodb";
import type { EventDoc, Memory, Profile } from "@/lib/types";

/**
 * THE SCHEMA — frozen hour 0.
 *
 * Four collections and one index. Strength is never stored: it's a function
 * of `now`, so decay stays correct with no cron job and no cache to
 * invalidate.
 */

export const COLLECTIONS = {
  users: "users",
  friendships: "friendships",
  groups: "groups",
  events: "events",
} as const;

export type UserDoc = {
  _id: string;
  /**
   * Null for someone who was tagged before they ever signed in. With an email
   * the account is claimed on their first sign-in; without one they are a name
   * on a string and nothing more, which is still a real person in the graph.
   */
  email: string | null;
  name: string;
  avatarUrl: string | null;
  profile: Profile;
  google?: { refreshToken: string };
  dropbox?: {
    accessToken: string;
    /** Expiry of `accessToken`, ISO. Dropbox access tokens last four hours. */
    expiresAt: string;
    refreshToken: string;
    accountId: string;
    /** Which folder to scan. Chosen by the user after connecting. */
    folder: string | null;
  };
};

/** Undirected: `pair` is always sorted, so a friendship has one row, not two. */
export type FriendshipDoc = {
  _id: string;
  pair: [string, string];
  createdAt: string;
};

export type GroupDoc = {
  _id: string;
  name: string;
  emoji: string;
  memberIds: string[];
};

export type { EventDoc, Memory };

export const friendPair = (a: string, b: string): [string, string] =>
  a < b ? [a, b] : [b, a];

export async function ensureIndexes(db: Db) {
  await db.collection(COLLECTIONS.events).createIndex({ attendeeIds: 1, happenedAt: -1 });
  await db.collection(COLLECTIONS.friendships).createIndex({ pair: 1 });
  // Sign-in looks a user up by email, and two accounts sharing one email would
  // mean the wrong person claims the string. Partial, because a tagged contact
  // may have no email at all and several nulls are not a conflict.
  await db
    .collection(COLLECTIONS.users)
    .createIndex(
      { email: 1 },
      { unique: true, partialFilterExpression: { email: { $type: "string" } } },
    );
}
