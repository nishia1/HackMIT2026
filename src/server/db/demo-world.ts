import type { EventDoc, Memory } from "@/lib/types";
import { friendPair, type FriendshipDoc, type UserDoc } from "./schema";

/**
 * A believable year of history.
 *
 * Pure and deterministic: everything is expressed as days before an anchor
 * date, so the same call always produces the same world and the seeded
 * strings sit at the same tiers whenever you run it.
 *
 * It is shaped around one moment. Maya is fourteen events of real history
 * that stopped eight months ago — thick and grey, the string the app exists
 * to point at. Jordan is the control: fewer events, all recent, bright red.
 */

export const ME = "you";

type PersonSpec = {
  id: string;
  name: string;
  interests: string[];
  budget: UserDoc["profile"]["budget"];
  city: string | null;
  freeEvenings: number[];
};

const PEOPLE: PersonSpec[] = [
  { id: ME, name: "Nishi", interests: ["ramen", "bouldering", "live music"], budget: "cheap", city: "Atlanta", freeEvenings: [4, 5, 6] },
  { id: "maya", name: "Maya", interests: ["ramen", "film", "bouldering"], budget: "cheap", city: "Atlanta", freeEvenings: [4, 6] },
  { id: "jordan", name: "Jordan", interests: ["robotics", "live music", "coffee"], budget: "mid", city: "Atlanta", freeEvenings: [2, 4, 5] },
  { id: "alex", name: "Alex", interests: ["hiking", "coffee", "board games"], budget: "free", city: "Atlanta", freeEvenings: [0, 6] },
  { id: "priya", name: "Priya", interests: ["design", "galleries", "ramen"], budget: "mid", city: "Boston", freeEvenings: [3, 5] },
  { id: "sam", name: "Sam", interests: ["space", "climbing", "film"], budget: "splurge", city: "Boston", freeEvenings: [1, 5] },
  // Never met — these exist so Discover has something three hops out to find.
  { id: "kai", name: "Kai", interests: ["ramen", "cycling"], budget: "cheap", city: "Atlanta", freeEvenings: [5] },
  { id: "rhea", name: "Rhea", interests: ["ceramics", "live music"], budget: "mid", city: "Atlanta", freeEvenings: [4] },
  { id: "tomo", name: "Tomo", interests: ["design", "coffee"], budget: "cheap", city: "Boston", freeEvenings: [6] },
  { id: "noor", name: "Noor", interests: ["space", "hiking"], budget: "free", city: "Boston", freeEvenings: [2] },
  { id: "iris", name: "Iris", interests: ["film", "bouldering"], budget: "cheap", city: "Atlanta", freeEvenings: [3] },
];

const FRIENDSHIPS: [string, string][] = [
  [ME, "maya"],
  [ME, "jordan"],
  [ME, "alex"],
  [ME, "priya"],
  [ME, "sam"],
  // one hop past your friends — obvious mutuals, excluded from Discover
  ["maya", "kai"],
  ["alex", "kai"],
  ["priya", "tomo"],
  ["sam", "noor"],
  // three and four hops out — the Discover feed
  ["kai", "rhea"],
  ["tomo", "rhea"],
  ["noor", "iris"],
  ["rhea", "iris"],
];

type EventSpec = {
  /** Days before the anchor date. */
  daysAgo: number;
  title: string;
  kind: string;
  with: string[];
  extras?: number; // strangers along for the night, thinning the string
  stamps: [emoji: string, title: string, caption?: string][];
};

const EVENTS: EventSpec[] = [
  // ——— Maya: fourteen events, all of them old. The thick grey rope. ———
  { daysAgo: 660, title: "Ramen at 2am", kind: "food", with: ["maya"], stamps: [["🍜", "Ramen at 2am", "she ordered the spiciest thing on the menu and cried"]] },
  { daysAgo: 631, title: "Stone Mountain at sunrise", kind: "hike", with: ["maya"], stamps: [["🌄", "Sunrise, barely"], ["☕️", "Gas station coffee"]] },
  { daysAgo: 604, title: "Thrift crawl on Ponce", kind: "shopping", with: ["maya", "alex"], stamps: [["👖", "The corduroy incident"]] },
  { daysAgo: 570, title: "Midtown art house double feature", kind: "film", with: ["maya"], stamps: [["🎬", "Two films, one nap", "you slept through the second one"]] },
  { daysAgo: 540, title: "Climbing gym, first time", kind: "climb", with: ["maya", "alex"], stamps: [["🧗", "V0 and proud"]] },
  { daysAgo: 505, title: "Her birthday, the loud one", kind: "party", with: ["maya", "alex"], extras: 22, stamps: [["🎂", "24 candles"], ["🕺", "Someone's playlist"]] },
  { daysAgo: 470, title: "Ramen again, same table", kind: "food", with: ["maya"], stamps: [["🍜", "Same table, same order"]] },
  { daysAgo: 432, title: "Piedmont picnic", kind: "outdoors", with: ["maya", "priya"], stamps: [["🧺", "Too many strawberries"]] },
  { daysAgo: 398, title: "Studio session, 1am", kind: "music", with: ["maya"], stamps: [["🎹", "Four bars, all night", "neither of you could play"]] },
  { daysAgo: 350, title: "Beltline walk, whole thing", kind: "outdoors", with: ["maya"], stamps: [["🚶", "Nine miles, no plan"]] },
  { daysAgo: 322, title: "Pottery class you both quit", kind: "craft", with: ["maya", "priya"], stamps: [["🏺", "One lopsided bowl"]] },
  { daysAgo: 300, title: "Karaoke, Buford Highway", kind: "music", with: ["maya", "alex"], extras: 6, stamps: [["🎤", "Total Eclipse of the Heart"]] },
  { daysAgo: 275, title: "Last ramen before she moved", kind: "food", with: ["maya"], stamps: [["🍜", "Goodbye bowl", "you said you'd visit in a month"]] },
  { daysAgo: 243, title: "Airport drop-off", kind: "travel", with: ["maya"], stamps: [["✈️", "Curbside, 6am"]] },

  // ——— Jordan: fewer events, all recent. The control. ———
  { daysAgo: 96, title: "Robotics showcase", kind: "event", with: ["jordan"], extras: 14, stamps: [["🤖", "His humanoid walked"]] },
  { daysAgo: 61, title: "Coffee, then three more", kind: "coffee", with: ["jordan"], stamps: [["☕️", "Fourth refill"]] },
  { daysAgo: 34, title: "Show at the Earl", kind: "concert", with: ["jordan", "alex"], stamps: [["🎸", "Front row, ears ringing"], ["🍺", "The one beer"]] },
  { daysAgo: 12, title: "Sunday climb", kind: "climb", with: ["jordan"], stamps: [["🧗", "Finally sent it", "took eleven tries"]] },
  { daysAgo: 3, title: "Ramen, his turn to pay", kind: "food", with: ["jordan"], stamps: [["🍜", "He paid, eventually"]] },

  // ——— Alex: steady, cooling slightly. ———
  { daysAgo: 210, title: "Board game night", kind: "games", with: ["alex"], extras: 4, stamps: [["🎲", "Four hours of Root"]] },
  { daysAgo: 168, title: "Kennesaw Mountain", kind: "hike", with: ["alex"], stamps: [["⛰️", "Up before the heat"]] },
  { daysAgo: 120, title: "Coffee and job panic", kind: "coffee", with: ["alex"], stamps: [["☕️", "Two resumes, one table"]] },
  { daysAgo: 77, title: "Farmers market loop", kind: "outdoors", with: ["alex"], stamps: [["🥬", "Bought nothing"]] },
  { daysAgo: 45, title: "Trivia, second place", kind: "games", with: ["alex", "jordan"], extras: 3, stamps: [["🧠", "Lost on geography"]] },

  // ——— Priya: two good nights, five months ago. ———
  { daysAgo: 160, title: "Her gallery opening", kind: "art", with: ["priya"], extras: 30, stamps: [["🖼", "The blue room"]] },
  { daysAgo: 152, title: "Dumplings after the show", kind: "food", with: ["priya"], stamps: [["🥟", "Twenty of them", "she drew you on a napkin"]] },

  // ——— Sam: one night, a year ago. ———
  { daysAgo: 400, title: "Planetarium, then diner", kind: "outing", with: ["sam"], stamps: [["🪐", "Saturn through the small scope"]] },
];

const iso = (anchor: Date, daysAgo: number) =>
  new Date(anchor.getTime() - daysAgo * 86_400_000).toISOString();

/** Everyone in the demo world keeps the same evening window. */
const eveningWindows = (days: number[]): UserDoc["profile"]["freeWindows"] =>
  days.map((day) => ({ day, from: "18:00", to: "22:00" }));

function memoriesOf(spec: EventSpec): Memory[] {
  return spec.stamps.map(([emoji, title, caption]) => ({
    dropboxPath: null,
    thumbUrl: null,
    caption: caption ?? null,
    stampTitle: title,
    stampEmoji: emoji,
    addedBy: ME,
  }));
}

export type World = {
  users: UserDoc[];
  friendships: FriendshipDoc[];
  events: EventDoc[];
};

export function buildWorld(anchor: Date): World {
  const users: UserDoc[] = PEOPLE.map((p) => ({
    _id: p.id,
    email: `${p.id}@example.com`,
    name: p.name,
    avatarUrl: null,
    profile: {
      interests: p.interests,
      budget: p.budget,
      city: p.city,
      freeWindows: eveningWindows(p.freeEvenings),
      connectedApps: {},
    },
  }));

  const friendships: FriendshipDoc[] = FRIENDSHIPS.map(([a, b], i) => ({
    _id: `f${i}`,
    pair: friendPair(a, b),
    createdAt: iso(anchor, 700),
  }));

  const events: EventDoc[] = EVENTS.map((spec, i) => ({
    _id: `e${i}`,
    title: spec.title,
    happenedAt: iso(anchor, spec.daysAgo),
    kind: spec.kind,
    groupId: null,
    createdBy: ME,
    // Extras are the people you don't know at someone else's birthday: they
    // never get a string of their own, they just make everyone else's thinner.
    attendeeIds: [
      ME,
      ...spec.with,
      ...Array.from({ length: spec.extras ?? 0 }, (_, n) => `guest-${i}-${n}`),
    ],
    memories: memoriesOf(spec),
  }));

  return { users, friendships, events };
}
