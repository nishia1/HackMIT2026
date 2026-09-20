import { getDb } from "@/server/db/client";
import { COLLECTIONS } from "@/server/db/schema";
import { demoWorld } from "./memory-store";
import type { EventDoc } from "@/lib/types";

/** Data access only. Anything that decides something belongs in domain/. */

export async function findByAttendee(userId: string): Promise<EventDoc[]> {
  const db = await getDb();
  if (!db) {
    return demoWorld()
      .events.filter((e) => e.attendeeIds.includes(userId))
      .sort((a, b) => b.happenedAt.localeCompare(a.happenedAt));
  }
  return db
    .collection<EventDoc>(COLLECTIONS.events)
    .find({ attendeeIds: userId })
    .sort({ happenedAt: -1 })
    .toArray();
}

/** Every event the two of you were both at. */
export async function findShared(aId: string, bId: string): Promise<EventDoc[]> {
  const db = await getDb();
  if (!db) {
    return demoWorld()
      .events.filter((e) => e.attendeeIds.includes(aId) && e.attendeeIds.includes(bId))
      .sort((a, b) => b.happenedAt.localeCompare(a.happenedAt));
  }
  return db
    .collection<EventDoc>(COLLECTIONS.events)
    .find({ attendeeIds: { $all: [aId, bId] } })
    .sort({ happenedAt: -1 })
    .toArray();
}

/**
 * Every outing this person was part of, most recent first.
 *
 * The same query as findByAttendee, under the name the import path uses.
 */
export async function eventsWithPerson(personId: string, limit = 50): Promise<EventDoc[]> {
  const db = await getDb();
  if (!db) return (await findByAttendee(personId)).slice(0, limit);
  return db
    .collection<EventDoc>(COLLECTIONS.events)
    .find({ attendeeIds: personId })
    .sort({ happenedAt: -1 })
    .limit(limit)
    .toArray();
}

export async function allEvents(limit = 200): Promise<EventDoc[]> {
  const db = await getDb();
  if (!db) {
    return [...demoWorld().events]
      .sort((a, b) => b.happenedAt.localeCompare(a.happenedAt))
      .slice(0, limit);
  }
  return db
    .collection<EventDoc>(COLLECTIONS.events)
    .find({})
    .sort({ happenedAt: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Idempotent by `_id` — a candidate's id comes from its cluster's start time,
 * so re-importing the same roll updates rather than duplicates.
 *
 * The one place the demo world is not good enough: an event the user took the
 * trouble to tag has to outlive the process.
 */
export async function saveEvents(docs: EventDoc[]): Promise<{ added: number; updated: number }> {
  if (docs.length === 0) return { added: 0, updated: 0 };

  const db = await getDb();
  if (!db) {
    throw new Error("Cannot save events without a database — set MONGODB_URI in .env.local");
  }

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
export async function peopleByRecency(): Promise<
  { personId: string; lastSeenAt: string; count: number }[]
> {
  const db = await getDb();

  if (!db) {
    const seen = new Map<string, { lastSeenAt: string; count: number }>();
    for (const e of demoWorld().events) {
      for (const id of e.attendeeIds) {
        const prev = seen.get(id);
        seen.set(id, {
          lastSeenAt: !prev || e.happenedAt > prev.lastSeenAt ? e.happenedAt : prev.lastSeenAt,
          count: (prev?.count ?? 0) + 1,
        });
      }
    }
    return [...seen]
      .map(([personId, v]) => ({ personId, ...v }))
      .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
  }

  return db
    .collection<EventDoc>(COLLECTIONS.events)
    .aggregate<{ personId: string; lastSeenAt: string; count: number }>([
      { $unwind: "$attendeeIds" },
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
