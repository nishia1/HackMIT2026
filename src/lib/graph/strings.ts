import { neighbors, rarity } from "./core";
import type { GEdge, GNode, GraphIndex, Hop, Strand, StringBundle } from "./types";

/**
 * FINDING STRINGS
 *
 * The question this file answers is not "how far apart are two people" — it's
 * "how many separate, true reasons are there that these two are near each
 * other". Five independent three-hop paths is a much better story than one
 * two-hop path, and a shortest-path search throws exactly that away. So this
 * enumerates paths instead, then scores and prunes them.
 *
 * All four tuning knobs are at the top. If results feel wrong, start here
 * before changing the algorithm.
 */

const MAX_EDGES = 4; // you → via → via → via → them
const MAX_STRANDS_PER_PERSON = 8;
const MAX_PATHS_EXPLORED = 40_000; // ceiling so a dense node can't hang the page

/**
 * Below this a string is technically true and socially meaningless — "you're
 * both at Georgia Tech", which is true of 45,000 people. Raise it for a
 * pickier feed, lower it if your graph is sparse and nothing shows up.
 */
const MIN_STRAND_SCORE = 0.7;

export function findStrands(
  g: GraphIndex,
  fromId: string,
  toId: string,
  maxEdges = MAX_EDGES,
): Strand[] {
  if (fromId === toId) return [];
  const out: Strand[] = [];
  let explored = 0;

  const pathNodes: string[] = [fromId];
  const pathEdges: GEdge[] = [];
  const seen = new Set<string>([fromId]);

  const walk = (currentId: string) => {
    if (out.length >= MAX_STRANDS_PER_PERSON * 4) return;
    if (explored++ > MAX_PATHS_EXPLORED) return;
    if (pathEdges.length >= maxEdges) return;

    for (const { edge, otherId } of neighbors(g, currentId)) {
      if (otherId === toId) {
        pathNodes.push(otherId);
        pathEdges.push(edge);
        const strand = buildStrand(g, pathNodes, pathEdges);
        if (strand) out.push(strand);
        pathNodes.pop();
        pathEdges.pop();
        continue;
      }
      if (seen.has(otherId)) continue;

      const other = g.nodes.get(otherId);
      if (!other) continue;

      // Only people you actually know may sit inside a string. Routing through
      // a stranger produces technically-true noise — "you and Sam are linked
      // through Jordan, who you've also never met" — and buries the paths that
      // mean something.
      if (other.type === "PERSON") {
        const isMyFriend = pathEdges.length === 0 && edge.type === "KNOWS";
        if (!isMyFriend) continue;
      }

      seen.add(otherId);
      pathNodes.push(otherId);
      pathEdges.push(edge);
      walk(otherId);
      pathEdges.pop();
      pathNodes.pop();
      seen.delete(otherId);
    }
  };

  walk(fromId);

  return dedupeStrands(out)
    .filter((s) => s.score >= MIN_STRAND_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_STRANDS_PER_PERSON);
}

function buildStrand(g: GraphIndex, nodeIds: string[], edges: GEdge[]): Strand | null {
  const path = nodeIds.map((id) => g.nodes.get(id)).filter(Boolean) as GNode[];
  if (path.length !== nodeIds.length) return null;

  const hops: Hop[] = [];
  for (let i = 1; i < path.length - 1; i++) {
    hops.push({ via: path[i], edgeIn: edges[i - 1], edgeOut: edges[i] });
  }

  const meanWeight =
    edges.reduce((sum, e) => sum + e.weight, 0) / Math.max(edges.length, 1);

  // The narrowest shared thing dominates: one small lab in the path counts for
  // more than three big lecture halls.
  const rarities = hops.map((h) => rarity(g, h.via.id));
  const narrowest = rarities.length ? Math.max(...rarities) : 0.5;
  const breadth = rarities.length
    ? rarities.reduce((a, b) => a + b, 0) / rarities.length
    : narrowest;

  const lengthDecay = 1 / edges.length;
  const score = meanWeight * (0.7 * narrowest + 0.3 * breadth) * lengthDecay * 10;

  return { path, hops, score, label: hops.map((h) => h.via.name).join(" → ") };
}

/**
 * Collapse strings that say the same thing. Two passes: identical via-sets are
 * one string, and a longer string whose via-set contains a shorter one adds
 * nothing — "through Maya and the Robotics Showcase" isn't a second reason on
 * top of "through the Robotics Showcase", it's the same reason with a detour.
 */
function dedupeStrands(strands: Strand[]): Strand[] {
  const best = new Map<string, Strand>();
  for (const s of strands) {
    const key = s.hops
      .map((h) => h.via.id)
      .sort()
      .join("|");
    const existing = best.get(key);
    if (!existing || s.score > existing.score) best.set(key, s);
  }

  const unique = [...best.values()].sort((a, b) => a.hops.length - b.hops.length);
  const kept: { strand: Strand; vias: Set<string> }[] = [];
  for (const strand of unique) {
    const vias = new Set(strand.hops.map((h) => h.via.id));
    const redundant = kept.some(
      (k) => k.vias.size < vias.size && [...k.vias].every((id) => vias.has(id)),
    );
    if (!redundant) kept.push({ strand, vias });
  }
  return kept.map((k) => k.strand);
}

export function bundleFor(
  g: GraphIndex,
  meId: string,
  targetId: string,
): StringBundle | null {
  const target = g.nodes.get(targetId);
  if (!target) return null;
  const strands = findStrands(g, meId, targetId);
  return {
    target,
    strands,
    score: bundleScore(strands),
    known: isDirectlyKnown(g, meId, targetId),
  };
}

/**
 * Many independent strings beat one strong string, but with diminishing
 * returns — otherwise everyone in your 300-person lecture outranks your actual
 * lab partner.
 */
function bundleScore(strands: Strand[]): number {
  return strands.reduce((sum, s, i) => sum + s.score / (i + 1), 0);
}

export function isDirectlyKnown(g: GraphIndex, aId: string, bId: string) {
  return neighbors(g, aId).some((n) => n.otherId === bId && n.edge.type === "KNOWS");
}

/** The Explore feed: people you have real strings to, but haven't met. */
export function discoverPeople(
  g: GraphIndex,
  meId: string,
  { limit = 6, includeKnown = false } = {},
): StringBundle[] {
  const reachable = new Set<string>();
  let frontier = [meId];
  const visited = new Set([meId]);

  for (let depth = 0; depth < MAX_EDGES - 1; depth++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const { otherId } of neighbors(g, id)) {
        if (visited.has(otherId)) continue;
        visited.add(otherId);
        next.push(otherId);
        if (g.nodes.get(otherId)?.type === "PERSON") reachable.add(otherId);
      }
    }
    frontier = next;
  }

  const bundles: StringBundle[] = [];
  for (const personId of reachable) {
    if (!includeKnown && isDirectlyKnown(g, meId, personId)) continue;
    const bundle = bundleFor(g, meId, personId);
    if (bundle && bundle.strands.length > 0) bundles.push(bundle);
  }

  return bundles.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** "What if I wanted to meet more people in robotics?" */
export function whatIf(
  g: GraphIndex,
  meId: string,
  anchorId: string,
  { limit = 8 } = {},
): StringBundle[] {
  const near = new Set<string>();
  for (const { otherId } of neighbors(g, anchorId)) {
    const n = g.nodes.get(otherId);
    if (n?.type === "PERSON" && otherId !== meId) near.add(otherId);
    // One hop further: people in the clubs and events attached to the anchor.
    if (n && n.type !== "PERSON") {
      for (const hop of neighbors(g, otherId)) {
        const p = g.nodes.get(hop.otherId);
        if (p?.type === "PERSON" && hop.otherId !== meId) near.add(hop.otherId);
      }
    }
  }

  const bundles: StringBundle[] = [];
  for (const personId of near) {
    const bundle = bundleFor(g, meId, personId);
    if (bundle && bundle.strands.length > 0) bundles.push(bundle);
  }
  return bundles.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Upcoming events you're both attached to — the "go together" hook. */
export function sharedUpcoming(g: GraphIndex, aId: string, bId: string): GNode[] {
  const mine = new Set(
    neighbors(g, aId)
      .filter(({ otherId }) => g.nodes.get(otherId)?.type === "EVENT")
      .map(({ otherId }) => otherId),
  );
  const now = Date.now();
  return neighbors(g, bId)
    .filter(({ otherId }) => mine.has(otherId))
    .map(({ otherId }) => g.nodes.get(otherId)!)
    .filter((n) => {
      const starts = n.meta?.startsAt as string | undefined;
      return !starts || new Date(starts).getTime() > now;
    });
}

/** Everything one hop from you, for the Circle view. */
export function egoNetwork(g: GraphIndex, meId: string) {
  const center = g.nodes.get(meId) ?? null;
  if (!center) return { center, ring: [] as { node: GNode; edge: GEdge }[] };
  const ring = neighbors(g, meId)
    .map(({ edge, otherId }) => ({ node: g.nodes.get(otherId)!, edge }))
    .filter((r) => r.node)
    .sort((a, b) => b.edge.weight - a.edge.weight);
  return { center, ring };
}
