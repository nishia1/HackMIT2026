import { eventsWithPerson, peopleByRecency, saveEvents } from "@/server/repo/events";
import { photoUrl } from "@/lib/photo";
import type { EventDoc, Memory, StampView } from "@/lib/types";

/**
 * Confirmed events, and the read the connection screen is built on.
 *
 * Note the direction: we never ask Dropbox which photos belong to a person.
 * Mongo knows that, because `attendeeIds` is the string. Dropbox is only asked
 * to turn the paths Mongo hands back into pixels, and only at display time.
 */

export type ConfirmedEvent = {
  id: string;
  title: string;
  kind: string;
  happenedAt: string;
  attendeeIds: string[];
  photoPaths: string[];
};

const ME = "me";

export async function confirmEvents(
  incoming: ConfirmedEvent[],
): Promise<{ added: number; updated: number }> {
  const createdAt = new Date().toISOString();

  const docs: EventDoc[] = incoming
    // An event with nobody in it belongs to no string, so it is never written.
    .filter((e) => e.attendeeIds.length > 0)
    .map((e) => ({
      _id: e.id,
      title: e.title,
      kind: e.kind,
      happenedAt: e.happenedAt,
      groupId: null,
      createdBy: ME,
      attendeeIds: e.attendeeIds,
      memories: e.photoPaths.map(
        (dropboxPath): Memory => ({
          dropboxPath,
          caption: null,
          stampTitle: e.title,
          stampEmoji: "📷",
          addedBy: ME,
        }),
      ),
      createdAt,
    }));

  return saveEvents(docs);
}

/** Every photo you and this person appear in together, newest first. */
export async function stampsFor(personId: string): Promise<StampView[]> {
  const events = await eventsWithPerson(personId);

  return events.flatMap((e) =>
    e.memories.map(
      (m): StampView => ({
        eventId: e._id,
        title: m.stampTitle,
        emoji: m.stampEmoji,
        kind: e.kind,
        happenedAt: e.happenedAt,
        caption: m.caption,
        src: photoUrl(m.dropboxPath),
      }),
    ),
  );
}

/**
 * Tag-picker ordering: whoever you saw most recently, first. On a cold
 * database this is empty and the caller keeps its own order — the right
 * answer before there is any history to learn from.
 */
export async function recentCompanions(): Promise<string[]> {
  return (await peopleByRecency()).map((p) => p.personId);
}
