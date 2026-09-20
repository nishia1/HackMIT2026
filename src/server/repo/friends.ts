import { getDb } from "@/server/db/client";
import { COLLECTIONS, friendPair, type FriendshipDoc } from "@/server/db/schema";

/**
 * Discovery walks the whole friendship graph, and at demo scale the whole
 * graph is a few thousand rows — cheaper to load once and traverse in memory
 * than to round-trip per hop.
 */
export async function allPairs(): Promise<[string, string][]> {
  const db = await getDb();
  const docs = await db
    .collection<FriendshipDoc>(COLLECTIONS.friendships)
    .find({})
    .toArray();
  return docs.map((f) => f.pair);
}

/**
 * Idempotent by construction: `pair` is sorted and used as the id, so linking
 * two people who are already linked is a no-op rather than a second row.
 */
export async function link(aId: string, bId: string): Promise<void> {
  if (aId === bId) return;
  const db = await getDb();
  const pair = friendPair(aId, bId);
  await db.collection<FriendshipDoc>(COLLECTIONS.friendships).updateOne(
    { _id: pair.join("__") },
    { $setOnInsert: { pair, createdAt: new Date().toISOString() } },
    { upsert: true },
  );
}

export async function friendIdsOf(userId: string): Promise<string[]> {
  const pairs = await allPairs();
  return pairs
    .filter(([a, b]) => a === userId || b === userId)
    .map(([a, b]) => (a === userId ? b : a));
}
