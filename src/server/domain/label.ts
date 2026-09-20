import type { Cluster } from "@/server/domain/cluster";

/**
 * PURE. The placeholder title a cluster gets before anyone has looked at the
 * photos. Time of day and length already carry most of the signal: thirty
 * photos on a Saturday morning is a day out, six on a Tuesday night is dinner.
 *
 * Dev 1's vision `labelPhotos()` replaces this — same shape, better guess —
 * and the import screen is unchanged when it does.
 */

export type Label = { title: string; kind: string };

/**
 * The kinds an event can be, and the emoji each one stamps with.
 *
 * Deliberately a closed list. Asking someone to pick an emoji is one more
 * decision per event and the import already asks for two; deriving it from the
 * kind means the stamps on a string stay legible as a set rather than becoming
 * whatever eleven different emoji someone chose at 2am.
 *
 * The first five are what `templateLabel` guesses, so the picker always
 * contains the value already selected.
 */
export const KINDS = [
  { kind: "morning", emoji: "☕" },
  { kind: "outing", emoji: "🚶" },
  { kind: "dinner", emoji: "🍜" },
  { kind: "night out", emoji: "🌃" },
  { kind: "day out", emoji: "☀️" },
  { kind: "hike", emoji: "🥾" },
  { kind: "concert", emoji: "🎵" },
  { kind: "party", emoji: "🎉" },
  { kind: "trip", emoji: "✈️" },
  { kind: "study", emoji: "📚" },
] as const;

/** A thread for anything we don't recognise — including the seeded world's kinds. */
export const emojiFor = (kind: string): string =>
  KINDS.find((k) => k.kind === kind)?.emoji ?? "🧵";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function templateLabel(cluster: Cluster): Label {
  const start = new Date(cluster.startsAt);
  const hours = (+new Date(cluster.endsAt) - +start) / 3_600_000;
  const day = DAYS[start.getDay()];
  const hour = start.getHours();
  const weekend = start.getDay() === 0 || start.getDay() === 6;

  if (hours >= 5 && weekend) return { title: `All-day ${day}`, kind: "day out" };
  if (hour >= 21) return { title: `${day} night`, kind: "night out" };
  if (hour >= 17) return { title: `${day} evening`, kind: "dinner" };
  if (hour >= 11) return { title: `${day} afternoon`, kind: "outing" };
  return { title: `${day} morning`, kind: "morning" };
}
