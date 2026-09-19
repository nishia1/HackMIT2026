import type { EdgeType, GEdge, GNode, NodeType } from "@/lib/graph/types";

/**
 * THE WORLD
 *
 * This is the only place data lives right now. No database, no API keys, no
 * setup. Add a person, add an edge, reload — that's the whole loop.
 *
 * Two rules keep the rest of the app working:
 *
 *   1. Everything is a node. People, courses, clubs, interests, places and
 *      events are all the same shape, because the whole idea of the product is
 *      that they're all just things you can be connected to.
 *
 *   2. Every edge has a weight from 0 to 1 — how much this connection counts
 *      as evidence that two people are near each other. A 300-person lecture
 *      is thin (0.3). An 8-person lab is thick (0.95). Getting these roughly
 *      right matters more than adding more data.
 *
 * When you're ready for a real backend, this file becomes a database query and
 * nothing downstream changes.
 */

export type NodeSpec = {
  key: string; // short, stable id you type by hand — "maya", "cs2110"
  type: NodeType;
  name: string;
  emoji?: string;
  meta?: Record<string, unknown>;
};

export type EdgeSpec = [from: string, type: EdgeType, to: string, weight?: number];

const daysFromNow = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

export const NODES: NodeSpec[] = [
  // ——— people ———
  { key: "you", type: "PERSON", name: "Nishi", emoji: "🧵", meta: { major: "CS", year: "Sophomore" } },
  { key: "maya", type: "PERSON", name: "Maya", emoji: "🤖", meta: { major: "CS", year: "Sophomore" } },
  { key: "jordan", type: "PERSON", name: "Jordan", emoji: "🧑‍🔬", meta: { major: "ME", year: "Junior" } },
  { key: "alex", type: "PERSON", name: "Alex", emoji: "🚀", meta: { major: "CS", year: "Senior" } },
  { key: "priya", type: "PERSON", name: "Priya", emoji: "🎨", meta: { major: "Design", year: "Junior" } },
  { key: "sam", type: "PERSON", name: "Sam", emoji: "🛰", meta: { major: "Physics", year: "Grad" } },

  // ——— courses ———
  { key: "cs2110", type: "COURSE", name: "CS 2110", emoji: "💻" },
  { key: "cs3600", type: "COURSE", name: "CS 3600", emoji: "🧠" },

  // ——— clubs, labs, projects ———
  { key: "robotics", type: "CLUB", name: "Robotics Club", emoji: "🤖" },
  { key: "hexlabs", type: "CLUB", name: "HexLabs", emoji: "⬡" },
  { key: "humanoid", type: "PROJECT", name: "Humanoid Navigation Lab", emoji: "🦿" },

  // ——— interests ———
  { key: "embodied", type: "INTEREST", name: "Embodied AI", emoji: "🧠" },
  { key: "space", type: "INTEREST", name: "Space", emoji: "🚀" },
  { key: "design", type: "INTEREST", name: "Design", emoji: "🎨" },

  // ——— events ———
  { key: "hackgt", type: "EVENT", name: "HackGT", emoji: "🎟", meta: { startsAt: daysFromNow(-40) } },
  { key: "hackmit", type: "EVENT", name: "HackMIT", emoji: "🎟", meta: { startsAt: daysFromNow(-120) } },
  { key: "showcase", type: "EVENT", name: "Robotics Showcase", emoji: "🤖", meta: { startsAt: daysFromNow(1), cost: 0 } },
  { key: "reading", type: "EVENT", name: "Embodied AI reading group", emoji: "📚", meta: { startsAt: daysFromNow(5), cost: 0 } },
  { key: "festival", type: "EVENT", name: "Campus festival", emoji: "🎪", meta: { startsAt: daysFromNow(2), cost: 0 } },

  // ——— places ———
  { key: "gt", type: "PLACE", name: "Georgia Tech", emoji: "📍" },
  { key: "mit", type: "PLACE", name: "MIT", emoji: "📍" },
  { key: "atlanta", type: "PLACE", name: "Atlanta", emoji: "📍" },
];

/**
 * Edges are undirected when traversed — the direction here only exists so the
 * UI can phrase things the right way round ("Jordan presented at the
 * showcase", not the reverse).
 *
 * The demo is tuned so Jordan is the reveal: you have never met them, there is
 * no single obvious thing you share, and yet five separate paths reach them —
 * and one ends at an event you're already going to tomorrow. Maya is the
 * decoy: closer, more obvious, far less surprising.
 */
export const EDGES: EdgeSpec[] = [
  // your world
  ["you", "STUDIES", "cs2110", 0.3],
  ["you", "STUDIES", "cs3600", 0.5],
  ["you", "INTERESTED_IN", "embodied", 0.9],
  ["you", "ATTENDED", "hackgt", 0.6],
  ["you", "ATTENDED", "hackmit", 0.6],
  ["you", "ATTENDED", "showcase", 0.7],
  ["you", "KNOWS", "maya", 0.9],
  ["you", "KNOWS", "alex", 0.6],
  ["you", "LOCATED_IN", "gt", 0.2],

  // Maya — the obvious one
  ["maya", "STUDIES", "cs2110", 0.3],
  ["maya", "MEMBER_OF", "robotics", 0.8],
  ["maya", "ATTENDED", "hackgt", 0.6],
  ["maya", "ATTENDED", "showcase", 0.7],
  ["maya", "INTERESTED_IN", "embodied", 0.8],
  ["maya", "KNOWS", "jordan", 0.7],

  // Jordan — never met, five strings, presenting tomorrow
  ["jordan", "STUDIES", "cs3600", 0.5],
  ["jordan", "MEMBER_OF", "robotics", 0.8],
  ["jordan", "WORKS_ON", "humanoid", 0.95],
  ["jordan", "INTERESTED_IN", "embodied", 0.9],
  ["jordan", "ATTENDED", "hackmit", 0.6],
  ["jordan", "PRESENTED_AT", "showcase", 0.9],

  // supporting cast
  ["alex", "ATTENDED", "hackgt", 0.6],
  ["alex", "MEMBER_OF", "hexlabs", 0.8],
  ["priya", "MEMBER_OF", "hexlabs", 0.8],
  ["priya", "INTERESTED_IN", "design", 0.7],
  ["priya", "ATTENDED", "festival", 0.5],
  ["sam", "WORKS_ON", "humanoid", 0.95],
  ["sam", "INTERESTED_IN", "space", 0.8],
  ["sam", "STUDIES", "cs3600", 0.5],

  // how the world itself hangs together
  ["robotics", "LOCATED_IN", "gt", 0.2],
  ["humanoid", "LOCATED_IN", "gt", 0.2],
  ["showcase", "LOCATED_IN", "gt", 0.2],
  ["hackgt", "LOCATED_IN", "atlanta", 0.2],
  ["hackmit", "LOCATED_IN", "mit", 0.2],
  ["robotics", "INTERESTED_IN", "embodied", 0.6],
  ["humanoid", "INTERESTED_IN", "embodied", 0.9],
  ["reading", "INTERESTED_IN", "embodied", 0.8],
  ["showcase", "INTERESTED_IN", "embodied", 0.5],
];

/** Who you're signed in as. Change this to see the app as someone else. */
export const CURRENT_USER_KEY = "you";

// ——— plumbing: turns the specs above into the shapes the graph code wants ———

export const nodes: GNode[] = NODES.map((s) => ({
  id: s.key,
  type: s.type,
  name: s.name,
  emoji: s.emoji ?? null,
  meta: s.meta ?? {},
}));

export const edges: GEdge[] = EDGES.map(([from, type, to, weight], i) => ({
  id: `e${i}`,
  type,
  fromId: from,
  toId: to,
  weight: weight ?? 0.5,
}));
