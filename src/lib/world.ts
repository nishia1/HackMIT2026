import { parseNow } from "@/lib/now";
import {
  getDiscoveries,
  getNudges,
  getString,
  getStrings,
} from "@/server/services/strings";
import { currentUserId } from "@/server/services/session";
import type { Discovery, Nudge, StringView } from "@/lib/types";
import { findAll } from "@/server/repo/users";

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
  const meId = currentUserId();
  const [strings, nudges] = await Promise.all([
    getStrings(meId, now),
    getNudges(meId, now),
  ]);
  return { now: now.toISOString(), strings, nudges };
}

export async function loadString(
  personId: string,
  nowParam?: string | null,
): Promise<StringView | null> {
  return getString(currentUserId(), personId, parseNow(nowParam));
}

export async function loadDiscoveries(limit = 12): Promise<Discovery[]> {
  return getDiscoveries(currentUserId(), limit);
}

/**
 * Everyone available to tag as an attendee when importing an event.
 * Excludes you — you were obviously there, no need to tag yourself.
 */
export async function getPeople(): Promise<{ id: string; name: string; emoji: string | null }[]> {
  const me = currentUserId();
  const users = await findAll();
  return users
    .filter((u) => u._id !== me)
    .map((u) => ({ id: u._id, name: u.name, emoji: u.avatarUrl }));
}
