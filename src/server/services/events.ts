import { eventsWithPerson, peopleByRecency, saveEvents } from "@/server/repo/events";
import { link } from "@/server/repo/friends";
import { emojiFor } from "@/server/domain/label";
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
  /**
   * Dropbox path → what the user wrote about that photo. Sparse: captions are
   * offered on an event's few sample photos, not on all two hundred.
   */
  captions?: Record<string, string>;
};

/** Long enough for a thought, short enough for the strip it renders in. */
const CAPTION_MAX = 80;

/**
 * A field touched and then cleared is not a caption. Storing `""` would make
 * `caption ? …` true everywhere downstream and render an empty line.
 */
function caption(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  return trimmed ? trimmed.slice(0, CAPTION_MAX) : null;
}

export async function confirmEvents(
  meId: string,
  incoming: ConfirmedEvent[],
): Promise<{ added: number; updated: number }> {
  const createdAt = new Date().toISOString();

  const kept = incoming
    // An event with nobody in it belongs to no string, so it is never written.
    .filter((e) => e.attendeeIds.length > 0)
    // You were there — it was your camera roll. Tagging yourself would be a
    // strange thing to ask, but every read scopes by attendance, so the event
    // would be invisible to you if we left you out.
    .map((e) => ({ ...e, attendeeIds: [...new Set([meId, ...e.attendeeIds])] }));

  const docs: EventDoc[] = kept.map((e) => ({
    // Namespaced by owner: a candidate id is a cluster start time, and two
    // people photographing the same evening would otherwise overwrite one
    // another's event.
    _id: `${meId}:${e.id}`,
    title: e.title,
    kind: e.kind,
    happenedAt: e.happenedAt,
    groupId: null,
    createdBy: meId,
    attendeeIds: e.attendeeIds,
    memories: e.photoPaths.map(
      (dropboxPath): Memory => ({
        dropboxPath,
        // Deliberately never filled: Dropbox links expire in four hours, so
        // a stored one is a broken image tomorrow. /api/photo mints a fresh
        // view from dropboxPath on every read instead.
        thumbUrl: null,
        caption: caption(e.captions?.[dropboxPath]),
        stampTitle: e.title,
        stampEmoji: emojiFor(e.kind),
        // Whose Dropbox the file is in. /api/photo needs this to know which
        // account to fetch from when the viewer is not the photographer.
        addedBy: meId,
      }),
    ),
    createdAt,
  }));

  // Being at the same event is what makes two people connected — the graph
  // discovery walks is built here, as a side effect of tagging.
  await Promise.all(
    [...new Set(kept.flatMap((e) => e.attendeeIds))]
      .filter((id) => id !== meId)
      .map((id) => link(meId, id)),
  );

  return saveEvents(docs);
}

/** Every photo you and this person appear in together, newest first. */
export async function stampsFor(meId: string, personId: string): Promise<StampView[]> {
  const events = await eventsWithPerson(meId, personId);

  return events.flatMap((e) =>
    e.memories
      // A memory with no path has no image. Asking for it anyway would render
      // a broken thumbnail.
      .filter((m): m is Memory & { dropboxPath: string } => Boolean(m.dropboxPath))
      .map(
        (m): StampView => ({
          eventId: e._id,
          title: m.stampTitle,
          emoji: m.stampEmoji,
          kind: e.kind,
          happenedAt: e.happenedAt,
          caption: m.caption,
          // The photo lives in whoever's Dropbox took it, which on a shared
          // event is often not the person looking at it.
          src: photoUrl(m.dropboxPath, m.addedBy),
        }),
      ),
  );
}

/**
 * Tag-picker ordering: whoever you saw most recently, first. Empty before you
 * have any history, and the caller keeps its own order — the right answer
 * when there is nothing to learn from yet.
 */
export async function recentCompanions(meId: string): Promise<string[]> {
  return (await peopleByRecency(meId)).map((p) => p.personId);
}
