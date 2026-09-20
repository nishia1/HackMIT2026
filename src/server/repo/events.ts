import { getDb } from "@/server/db/client";
import { COLLECTIONS } from "@/server/db/schema";
import type { EventDoc } from "@/lib/types";

/** Data access only. Anything that decides something belongs in domain/. */

export async function findByAttendee(userId: string): Promise<EventDoc[]> {
  const db = await getDb();
  return db
    .collection<EventDoc>(COLLECTIONS.events)
    .find({ attendeeIds: userId })
    .sort({ happenedAt: -1 })
    .toArray();
}

/** Every event the two of you were both at. */
export async function findShared(aId: string, bId: string): Promise<EventDoc[]> {
  const db = await getDb();
  return db
    .collection<EventDoc>(COLLECTIONS.events)
    .find({ attendeeIds: { $all: [aId, bId] } })
    .sort({ happenedAt: -1 })
    .toArray();
}

/**
 * Every outing the two of you were both at, most recent first.
 *
 * Both ids, not just theirs: an event this person went to without you is
 * their history, not yours, and is none of your business.
 */
export async function eventsWithPerson(
  meId: string,
  personId: string,
  limit = 50,
): Promise<EventDoc[]> {
  const db = await getDb();
  return db
    .collection<EventDoc>(COLLECTIONS.events)
    .find({ attendeeIds: { $all: [meId, personId] } })
    .sort({ happenedAt: -1 })
    .limit(limit)
    .toArray();
}

/** Your own history — every event you were tagged in. */
export async function eventsFor(userId: string, limit = 200): Promise<EventDoc[]> {
  const db = await getDb();
  return db
    .collection<EventDoc>(COLLECTIONS.events)
    .find({ attendeeIds: userId })
    .sort({ happenedAt: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Idempotent by `_id` — a candidate's id is derived from its cluster's start
 * time and its owner, so re-importing the same roll updates rather than
 * duplicates, and two people's rolls never collide on the same id.
 */
export async function saveEvents(docs: EventDoc[]): Promise<{ added: number; updated: number }> {
  if (docs.length === 0) return { added: 0, updated: 0 };

  const db = await getDb();

  const res = await db.collection<EventDoc>(COLLECTIONS.events).bulkWrite(
    docs.map((doc) => ({
      replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
    })),
    { ordered: false },
  );

  return { added: res.upsertedCount, updated: res.modifiedCount };
}

/**
 * Who you have been seeing, most recent outing first — the ordering the tag
 * picker uses, so the people you actually hang out with are the first chips.
 */
export async function peopleByRecency(
  userId: string,
): Promise<{ personId: string; lastSeenAt: string; count: number }[]> {
  const db = await getDb();

  return db
    .collection<EventDoc>(COLLECTIONS.events)
    .aggregate<{ personId: string; lastSeenAt: string; count: number }>([
      // Your outings only — otherwise the tag picker is ranked by strangers.
      { $match: { attendeeIds: userId } },
      { $unwind: "$attendeeIds" },
      { $match: { attendeeIds: { $ne: userId } } },
      {
        $group: {
          _id: "$attendeeIds",
          lastSeenAt: { $max: "$happenedAt" },
          count: { $sum: 1 },
        },
      },
      { $sort: { lastSeenAt: -1 } },
      { $project: { _id: 0, personId: "$_id", lastSeenAt: 1, count: 1 } },
    ])
    .toArray();
}
