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
  email: string;
  name: string;
  avatarUrl: string | null;
  profile: Profile;
  google?: { refreshToken: string };
  dropbox?: { accessToken: string; refreshToken: string; accountId: string };
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
}
