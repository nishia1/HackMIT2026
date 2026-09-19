import { buildIndex } from "@/lib/graph/core";
import {
  bundleFor,
  discoverPeople,
  egoNetwork,
  sharedUpcoming,
  whatIf,
} from "@/lib/graph/strings";
import { describeStrand, headlineFor } from "@/lib/graph/describe";
import { CURRENT_USER_KEY, edges, nodes } from "@/data/world";
import type { GNode } from "@/lib/graph/types";

/**
 * THE SEAM
 *
 * Every screen talks to the app through this file and nothing else. Right now
 * these functions read the mock data synchronously. When you add a backend,
 * make each one `async` and `fetch()` instead — the screens already `await`
 * them, so nothing in the UI has to change.
 *
 * Add a feature by adding a function here, not by importing graph internals
 * into a component.
 */

const graph = buildIndex(nodes, edges);

export const me = graph.nodes.get(CURRENT_USER_KEY)!;

export type StrandView = {
  label: string;
  phrasing: string;
  path: { id: string; name: string; type: string; emoji: string | null }[];
};

export type PersonView = {
  person: GNode;
  known: boolean;
  score: number;
  headline: string;
  strands: StrandView[];
  upcoming: GNode[];
};

const toView = (bundle: NonNullable<ReturnType<typeof bundleFor>>): PersonView => ({
  person: bundle.target,
  known: bundle.known,
  score: bundle.score,
  headline: headlineFor(bundle),
  upcoming: sharedUpcoming(graph, me.id, bundle.target.id),
  strands: bundle.strands.map((s) => ({
    label: s.label,
    phrasing: describeStrand(s),
    path: s.path.map((n) => ({ id: n.id, name: n.name, type: n.type, emoji: n.emoji })),
  })),
});

/** Your circle: you, everything one hop out, and how those things interlink. */
export async function getCircle() {
  const { center, ring } = egoNetwork(graph, me.id);
  if (!center) throw new Error(`No node with key "${CURRENT_USER_KEY}"`);

  const ringIds = new Set(ring.map((r) => r.node.id));
  const links = ring.map((r) => ({
    source: center.id,
    target: r.node.id,
    type: r.edge.type,
  }));

  // Links *between* ring members are what make this read as a map rather than
  // a starburst.
  for (const r of ring) {
    for (const n of graph.adj.get(r.node.id) ?? []) {
      if (n.otherId !== center.id && ringIds.has(n.otherId) && r.node.id < n.otherId) {
        links.push({ source: r.node.id, target: n.otherId, type: n.edge.type });
      }
    }
  }

  return { center, nodes: ring.map((r) => r.node), links };
}

/** The Explore feed: people you have strings to but haven't met. */
export async function getDiscoveries(limit = 4): Promise<PersonView[]> {
  return discoverPeople(graph, me.id, { limit }).map(toView);
}

/** Everything connecting you to one person — the Connection Card. */
export async function getPerson(id: string): Promise<PersonView | null> {
  const bundle = bundleFor(graph, me.id, id);
  return bundle ? toView(bundle) : null;
}

/** Everyone you could have been with in a photo. */
export async function getPeople() {
  return [...graph.nodes.values()]
    .filter((n) => n.type === "PERSON" && n.id !== me.id)
    .map((n) => ({ id: n.id, name: n.name, emoji: n.emoji }));
}

/** "What if I wanted to meet more people in robotics?" */
export async function askWhatIf(query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return { anchor: null, results: [] as PersonView[], events: [] as GNode[] };

  const all = [...graph.nodes.values()];
  const anchor =
    all.find((n) => n.name.toLowerCase() === needle) ??
    all.find((n) => needle.includes(n.name.toLowerCase())) ??
    all.find((n) => n.name.toLowerCase().includes(needle));

  if (!anchor) return { anchor: null, results: [] as PersonView[], events: [] as GNode[] };

  const events = (graph.adj.get(anchor.id) ?? [])
    .map((n) => graph.nodes.get(n.otherId)!)
    .filter((n) => n?.type === "EVENT");

  return { anchor, events, results: whatIf(graph, me.id, anchor.id).map(toView) };
}

export function getNode(id: string) {
  return graph.nodes.get(id) ?? null;
}
