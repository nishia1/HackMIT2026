import type { Tier } from "@/lib/types";

/**
 * TIERS
 *
 * Pure, and free of React and the database, so a component can import it for
 * colours and the API can import it for tiers without either one dragging the
 * other along.
 */

export function tierOf(warmth: number): Tier {
  if (warmth > 0.6) return "alive";
  if (warmth > 0.3) return "warm";
  if (warmth > 0.1) return "fading";
  return "cold";
}

export const TIER_LABEL: Record<Tier, string> = {
  alive: "Alive",
  warm: "Warm",
  fading: "Fading",
  cold: "Gone cold",
};

/**
 * A shared event is worth roughly 2 depth, so a dozen of them saturates the
 * stroke. Lower this if your strings all render at full thickness — it's the
 * one knob that decides whether the circle reads as a gradient or a starburst.
 */
const DEPTH_FULL = 24;

export function strokeFor(depth: number): number {
  return 1 + 5 * Math.min(depth / DEPTH_FULL, 1);
}

const GREY = [0x5a, 0x51, 0x75] as const; // --ink-soft
const RED = [0xe2, 0x48, 0x3d] as const; // --string

/** Grey at warmth 0, red at warmth 1. */
export function colorFor(warmth: number): string {
  const t = Math.min(Math.max(warmth, 0), 1);
  const channel = (i: number) => Math.round(GREY[i] + (RED[i] - GREY[i]) * t);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

/**
 * A string earns a nudge when it mattered and has stopped being recent.
 * "cold" is fading that went further, so it qualifies too — a friendship you
 * haven't touched in a year is the one you most need telling about.
 */
export function deservesNudge(tier: Tier, depth: number): boolean {
  return (tier === "fading" || tier === "cold") && depth > 0.3;
}

/** How much history × how cold it's gone. Sort nudges by this, descending. */
export function losing(depth: number, warmth: number): number {
  return depth * (1 - warmth);
}
