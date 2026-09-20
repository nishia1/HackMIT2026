import type { Discovery } from "@/lib/types";

/**
 * DISCOVERY
 *
 * People three and four friendships away. One and two hops are excluded: a
 * direct friend isn't a discovery, and an obvious mutual isn't either. Four is
 * as far as the word "connected" survives.
 *
 * Ranked by how many distinct chains reach someone, because one chain is a
 * coincidence and five is a social circle you're standing next to.
 *
 * Pure: it takes an adjacency map, not a database.
 */

const MAX_DEGREE = 4;
const MIN_DEGREE = 3;
/** Ceiling so a dense graph can't hang the request. */
const MAX_VISITED = 5_000;

export type Adjacency = Map<string, string[]>;

export function adjacencyOf(pairs: [string, string][]): Adjacency {
  const adj: Adjacency = new Map();
  const link = (a: string, b: string) => {
    const list = adj.get(a) ?? [];
    if (!list.includes(b)) list.push(b);
    adj.set(a, list);
  };
  for (const [a, b] of pairs) {
    link(a, b);
    link(b, a);
  }
  return adj;
}

type Found = { degree: number; pathCount: number; via: string[] };

/**
 * Enumerates simple chains up to four hops. Depths 1 and 2 are still walked —
 * they're how you reach depth 3 — they just never appear in the result, and
 * anyone reachable in ≤2 hops is dropped at the end however many long chains
 * also reach them.
 */
export function discover(
  adj: Adjacency,
  meId: string,
  { limit = 12 }: { limit?: number } = {},
): Discovery[] {
  const found = new Map<string, Found>();
  const tooClose = new Set<string>([meId]);
  let visited = 0;

  const path: string[] = [meId];
  const onPath = new Set<string>([meId]);

  const walk = (currentId: string) => {
    if (path.length - 1 >= MAX_DEGREE) return;
    for (const otherId of adj.get(currentId) ?? []) {
      if (onPath.has(otherId)) continue;
      if (visited++ > MAX_VISITED) return;

      const degree = path.length;
      if (degree <= 2) tooClose.add(otherId);

      if (degree >= MIN_DEGREE) {
        const prev = found.get(otherId);
        if (!prev) {
          found.set(otherId, { degree, pathCount: 1, via: path.slice(1) });
        } else {
          prev.pathCount += 1;
          // Keep the shortest chain as the one we show.
          if (degree < prev.degree) {
            prev.degree = degree;
            prev.via = path.slice(1);
          }
        }
      }

      onPath.add(otherId);
      path.push(otherId);
      walk(otherId);
      path.pop();
      onPath.delete(otherId);
    }
  };

  walk(meId);

  return [...found.entries()]
    .filter(([id]) => !tooClose.has(id))
    .map(([personId, f]) => ({
      personId,
      name: personId,
      avatarUrl: null,
      degree: f.degree,
      pathCount: f.pathCount,
      via: f.via,
    }))
    .sort((a, b) => b.pathCount - a.pathCount || a.degree - b.degree)
    .slice(0, limit);
}
