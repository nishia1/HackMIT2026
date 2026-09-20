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
