import * as events from "@/server/repo/events";
import * as friends from "@/server/repo/friends";
import * as users from "@/server/repo/users";
import { adjacencyOf, discover } from "@/server/domain/discover";
import { emojiFor } from "@/server/domain/label";
import { photoUrl } from "@/lib/photo";
import { daysBetween, strengthOf } from "@/server/domain/strength";
import { deservesNudge, losing, tierOf } from "@/server/domain/tiers";
import type { Discovery, EventDoc, Nudge, Stamp, StringView } from "@/lib/types";

/**
 * THE READ PATH
 *
 * One query, one pass, no aggregation pipeline and no stored totals. At demo
 * scale that's a few milliseconds, and it means decay is always correct for
 * whatever `now` you hand it.
 */

/**
 * One stamp per event — not per photo.
 *
 * A stamp is the thing that happened. A weekend away is two hundred photos and
 * one stamp; mapping each memory to its own turned a string's history into two
 * hundred near-identical rows, which is a list of files rather than a record of
 * a friendship.
 *
 * The cover comes from the first memory with a path. `thumbUrl` is never set
 * on purpose — a stored Dropbox link is a broken image in four hours — so the
 * URL is minted from the path at read time, like every other photo here.
 */
export function stampsOf(event: EventDoc): Stamp[] {
  const withPhoto = event.memories.find((m) => m.dropboxPath);
  const captioned = event.memories.find((m) => m.caption);

  return [
    {
      eventId: event._id,
      title: event.title,
      emoji: emojiFor(event.kind),
      kind: event.kind,
      happenedAt: event.happenedAt,
      photoCount: event.memories.filter((m) => m.dropboxPath).length,
      photoUrl: withPhoto?.dropboxPath
        ? photoUrl(withPhoto.dropboxPath, withPhoto.addedBy)
        : null,
      // Whatever the person actually wrote about this outing, if anything. One
      // line of theirs beats a generated title.
      caption: captioned?.caption ?? null,
    },
  ];
}

/** Every event you were at, bucketed by who else was there. */
async function bucketByCoAttendee(meId: string) {
  const mine = await events.findByAttendee(meId);

  const buckets = new Map<string, EventDoc[]>();
  for (const event of mine) {
    for (const personId of event.attendeeIds) {
      if (personId === meId) continue;
      const list = buckets.get(personId) ?? [];
      list.push(event);
      buckets.set(personId, list);
    }
  }

  // Attendee ids with no user row are the strangers at someone else's
  // birthday. They thinned the strings they were part of; they don't get one.
  const people = await users.findManyByIds([...buckets.keys()]);
  for (const id of buckets.keys()) if (!people.has(id)) buckets.delete(id);

  return { buckets, people };
}

/** Every string, each paired with the events it was computed from. */
async function computeStrings(meId: string, now: Date) {
  const { buckets, people } = await bucketByCoAttendee(meId);

  const out: { view: StringView; shared: EventDoc[] }[] = [];
  for (const [personId, shared] of buckets) {
    const person = people.get(personId)!;
    const { depth, warmth, eventCount, lastSeenAt } = strengthOf(shared, now);
    out.push({
      shared,
      view: {
        personId,
        name: person.name,
        avatarUrl: person.avatarUrl,
        depth,
        warmth,
        tier: tierOf(warmth),
        eventCount,
        lastSeenAt,
        stamps: [],
      },
    });
  }

  return out.sort((a, b) => b.view.depth - a.view.depth);
}

export async function getStrings(meId: string, now: Date): Promise<StringView[]> {
  return (await computeStrings(meId, now)).map((s) => s.view);
}

/** One string, with every stamp on it — the card screen. */
export async function getString(
  meId: string,
  personId: string,
  now: Date,
): Promise<StringView | null> {
  const person = await users.findById(personId);
  if (!person || personId === meId) return null;

  const shared = await events.findShared(meId, personId);
  const { depth, warmth, eventCount, lastSeenAt } = strengthOf(shared, now);

  return {
    personId,
    name: person.name,
    avatarUrl: person.avatarUrl,
    depth,
    warmth,
    tier: tierOf(warmth),
    eventCount,
    lastSeenAt,
    stamps: shared.flatMap(stampsOf),
  };
}

/**
 * Who you're losing. No AI: `depth × (1 − warmth)` ranks "old close friend you
 * haven't seen in six months" above "acquaintance you met once last year",
 * which is exactly right.
 *
 * The copy is a plain template. Dev 1 swaps it for `nudgeCopy()` at hour 8 and
 * nothing else has to change.
 */
export async function getNudges(meId: string, now: Date, limit = 3): Promise<Nudge[]> {
  const strings = await computeStrings(meId, now);

  const nudges: Nudge[] = [];
  for (const { view: s, shared } of strings) {
    if (!deservesNudge(s.tier, s.depth)) continue;
    const last = shared[0] ?? null;
    const lastStamp = last ? (stampsOf(last)[0] ?? null) : null;
    const daysSince = s.lastSeenAt ? Math.round(daysBetween(s.lastSeenAt, now)) : 0;
    nudges.push({
      personId: s.personId,
      name: s.name,
      losing: losing(s.depth, s.warmth),
      daysSince,
      lastStamp,
      line: nudgeLine(s.name, daysSince, lastStamp),
    });
  }

  return nudges.sort((a, b) => b.losing - a.losing).slice(0, limit);
}

function nudgeLine(name: string, daysSince: number, lastStamp: Stamp | null): string {
  const months = Math.max(1, Math.round(daysSince / 30));
  const span = months >= 12 ? "Over a year" : `${months} months`;
  return lastStamp
    ? `${span} since ${lastStamp.title.toLowerCase()} with ${name}.`
    : `${span} since you saw ${name}.`;
}

/** People three and four friendships out. A side tab, not the product. */
export async function getDiscoveries(meId: string, limit = 12): Promise<Discovery[]> {
  const adj = adjacencyOf(await friends.allPairs());
  const raw = discover(adj, meId, { limit });
  const people = await users.findManyByIds([
    ...raw.map((d) => d.personId),
    ...raw.flatMap((d) => d.via),
  ]);

  return raw.map((d) => {
    const person = people.get(d.personId);
    return {
      ...d,
      name: person?.name ?? d.personId,
      avatarUrl: person?.avatarUrl ?? null,
      via: d.via.map((id) => people.get(id)?.name ?? id),
    };
  });
}
