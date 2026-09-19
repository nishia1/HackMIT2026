import type { GEdge, GNode, GraphIndex } from "./types";

/** Builds the adjacency index the traversal walks. */
export function buildIndex(nodes: GNode[], edges: GEdge[]): GraphIndex {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const adj = new Map<string, { edge: GEdge; otherId: string }[]>();
  const degree = new Map<string, number>();

  const push = (from: string, otherId: string, edge: GEdge) => {
    const list = adj.get(from) ?? [];
    list.push({ edge, otherId });
    adj.set(from, list);
    degree.set(from, (degree.get(from) ?? 0) + 1);
  };

  for (const e of edges) {
    if (!nodeMap.has(e.fromId) || !nodeMap.has(e.toId)) {
      console.warn(`[graph] edge ${e.fromId} → ${e.toId} references a missing node`);
      continue;
    }
    // Indexed from both ends, because traversal is undirected.
    push(e.fromId, e.toId, e);
    push(e.toId, e.fromId, e);
  }

  return { nodes: nodeMap, adj, degree };
}

export function neighbors(g: GraphIndex, id: string) {
  return g.adj.get(id) ?? [];
}

/**
 * How much a shared node is worth as evidence.
 *
 * Sharing a 300-person lecture says almost nothing. Sharing an 8-person lab
 * says a lot. Rarity falls off logarithmically with degree, so a few popular
 * hubs can't dominate every result.
 */
export function rarity(g: GraphIndex, id: string): number {
  const d = g.degree.get(id) ?? 1;
  return 1 / Math.log2(d + 2);
}
