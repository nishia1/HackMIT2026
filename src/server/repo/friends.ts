import { getDb } from "@/server/db/client";
import { COLLECTIONS, type FriendshipDoc } from "@/server/db/schema";
import { demoWorld } from "./memory-store";

/**
 * Discovery walks the whole friendship graph, and at demo scale the whole
 * graph is a few thousand rows — cheaper to load once and traverse in memory
 * than to round-trip per hop.
 */
export async function allPairs(): Promise<[string, string][]> {
  const db = await getDb();
  const docs = db
    ? await db.collection<FriendshipDoc>(COLLECTIONS.friendships).find({}).toArray()
    : demoWorld().friendships;
  return docs.map((f) => f.pair);
}

export async function friendIdsOf(userId: string): Promise<string[]> {
  const pairs = await allPairs();
  return pairs
    .filter(([a, b]) => a === userId || b === userId)
    .map(([a, b]) => (a === userId ? b : a));
}
