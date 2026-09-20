import type { Collection } from "mongodb";
import { db } from "@/server/db";
import type { EventDoc } from "@/lib/types";

/**
 * The events collection, and the two questions the app asks of it: "remember
 * this outing" and "what did I do with this person". Everything the circle
 * renders is downstream of the second one.
 */

let indexed = false;

async function events(): Promise<Collection<EventDoc>> {
  const col = (await db()).collection<EventDoc>("events");
  if (!indexed) {
    // Multikey on attendeeIds: the connection screen's whole query. Without it
    // every card read is a collection scan.
    await col.createIndex({ attendeeIds: 1, happenedAt: -1 });
    await col.createIndex({ happenedAt: -1 });
    indexed = true;
  }
  return col;
}

/**
 * Idempotent by `_id` — the candidate id is derived from the cluster's start
 * time, so re-importing the same roll updates rather than duplicates. Returns
 * how many were new, which is what the import screen reports back.
 */
export async function saveEvents(docs: EventDoc[]): Promise<{ added: number; updated: number }> {
  if (docs.length === 0) return { added: 0, updated: 0 };

  const col = await events();
  const res = await col.bulkWrite(
    docs.map((doc) => ({
      replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
    })),
    { ordered: false },
  );

  return { added: res.upsertedCount, updated: res.modifiedCount };
}

/** Every outing this person was part of, most recent first. */
export async function eventsWithPerson(personId: string, limit = 50): Promise<EventDoc[]> {
  const col = await events();
  return col.find({ attendeeIds: personId }).sort({ happenedAt: -1 }).limit(limit).toArray();
}

export async function allEvents(limit = 200): Promise<EventDoc[]> {
  const col = await events();
  return col.find({}).sort({ happenedAt: -1 }).limit(limit).toArray();
}

/**
 * Who you have been seeing, most recent outing first — the ordering the tag
 * picker uses so the people you actually hang out with are the first chips.
 */
export async function peopleByRecency(): Promise<{ personId: string; lastSeenAt: string; count: number }[]> {
  const col = await events();
  return col
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
