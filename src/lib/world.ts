import { parseNow } from "@/lib/now";
import {
  getDiscoveries,
  getNudges,
  getString,
  getStrings,
} from "@/server/services/strings";
import { requireUserId } from "@/server/services/session";
import { photosWith } from "@/server/services/events";
import type { Discovery, Loop, Nudge, PhotoTile, StringView } from "@/lib/types";
import { findManyByIds } from "@/server/repo/users";
import { friendIdsOf } from "@/server/repo/friends";

/**
 * THE SEAM
 *
 * Every screen talks to the app through this file and nothing else. Server
 * components call straight into the services; the same services sit behind
 * `/api/strings` for anything client-side. Add a feature by adding a function
 * here, not by importing a service into a component.
 *
 * Server-only — it reaches the database. Components may import the types.
 */

export type Circle = {
  now: string;
  strings: StringView[];
  nudges: Nudge[];
};

export async function loadCircle(nowParam?: string | null): Promise<Circle> {
  const now = parseNow(nowParam);
  const meId = await requireUserId();
  const [strings, nudges] = await Promise.all([
    getStrings(meId, now),
    getNudges(meId, now),
  ]);
  return { now: now.toISOString(), strings, nudges };
}

export type CircleLoops = {
  now: string;
  loops: Loop[];
  nudges: Nudge[];
};

/**
 * What the circle screen renders: every connection you have, strongest first,
 * plus the ones worth a nudge. Empty on a new account — the ribbon still
 * draws, it just has no names to hang on it.
 */
export async function loadCircleLoops(nowParam?: string | null): Promise<CircleLoops> {
  const { now, strings, nudges } = await loadCircle(nowParam);
  return {
    now,
    loops: strings.map((s) => ({ personId: s.personId, name: s.name })),
    nudges,
  };
}

export async function loadString(
  personId: string,
  nowParam?: string | null,
): Promise<StringView | null> {
  return getString(await requireUserId(), personId, parseNow(nowParam));
}

/**
 * The photos for one connection's screen. `limit` is how many filler boxes
 * the design has room for, so the count is the view's business, not the
 * service's.
 */
export async function loadPhotosWith(personId: string, limit: number): Promise<PhotoTile[]> {
  return photosWith(await requireUserId(), personId, limit);
}

export async function loadDiscoveries(limit = 12): Promise<Discovery[]> {
  return getDiscoveries(await requireUserId(), limit);
}

/**
 * Everyone available to tag as an attendee when importing an event: the people
 * you are connected to, and nobody else. Excludes you — you were obviously
 * there, no need to tag yourself.
 *
 * A brand new account has none, which is why the tag screen can add one.
 */
export async function getPeople(): Promise<{ id: string; name: string; emoji: string | null }[]> {
  const me = await requireUserId();
  const users = await findManyByIds(await friendIdsOf(me));
  return [...users.values()]
    .filter((u) => u._id !== me)
    .map((u) => ({ id: u._id, name: u.name, emoji: u.avatarUrl }));
}
