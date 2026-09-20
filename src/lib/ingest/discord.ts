import type { GEdge, GNode } from "@/lib/graph/types";

/**
 * DISCORD INGEST
 *
 * Servers are the interesting signal here — a 12-person server is a group of
 * friends, and two people being in the same one is real evidence. Connections
 * are fetched for one reason: they carry the Steam id, which is the only way we
 * get at a Steam library (see ./steam.ts).
 */

const API = "https://discord.com/api/v10";

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  /** Only present because we ask for with_counts. */
  approximate_member_count?: number;
}

export interface DiscordConnection {
  /** "steam", "github", "spotify", … */
  type: string;
  /** For type "steam" this IS the steamID64. */
  id: string;
  name: string;
  verified: boolean;
}

/**
 * A server this big is a broadcast channel, not a group of friends. Sharing one
 * says nothing — and worse than nothing, because of how rarity() scores (see
 * guildsToGraph).
 */
const MAX_MEMBERS = 25_000;

/** Below this, a server is small enough that sharing it is evidence on its own. */
const SMALL_SERVER = 150;

async function discordGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`[discord] GET ${path} → ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

/**
 * One request, no pagination. The endpoint is scoped to the token's own user,
 * and 200 is the hard cap on servers a non-bot account can join, so a single
 * page always holds all of them. with_counts is what puts
 * approximate_member_count in the same response instead of costing us a
 * follow-up request per guild.
 */
export function fetchGuilds(token: string): Promise<DiscordGuild[]> {
  return discordGet<DiscordGuild[]>("/users/@me/guilds?with_counts=true&limit=200", token);
}

export function fetchConnections(token: string): Promise<DiscordConnection[]> {
  return discordGet<DiscordConnection[]>("/users/@me/connections", token);
}

/** The steamID64 for this account, or null if they haven't linked Steam. */
export function steamIdFrom(connections: DiscordConnection[]): string | null {
  return connections.find((c) => c.type === "steam")?.id ?? null;
}

/**
 * COMMUNITY nodes plus your MEMBER_OF edges to them.
 *
 * Huge servers are dropped outright rather than down-weighted, and that
 * distinction matters. rarity() in src/lib/graph/core.ts scores a node by its
 * degree *in our graph*, not by how big it is in the world. A 200k-member
 * server that only three of our users happen to be in therefore looks rarer
 * than an eight-person lab, and outranks it. A low edge weight doesn't save us:
 * weight only feeds meanWeight, while the rarity term still reads the node as
 * rare. Dropping at ingest is the only defense.
 */
export function guildsToGraph(
  meId: string,
  guilds: DiscordGuild[],
): { nodes: GNode[]; edges: GEdge[] } {
  const nodes: GNode[] = [];
  const edges: GEdge[] = [];

  for (const guild of guilds) {
    const members = guild.approximate_member_count ?? 0;
    if (members > MAX_MEMBERS) continue;

    const id = `discord:${guild.id}`;
    nodes.push({
      id,
      type: "COMMUNITY",
      name: guild.name,
      emoji: "💬",
      meta: { members, guildId: guild.id, source: "discord" },
    });
    edges.push({
      id: `e:${meId}:member_of:${id}`,
      type: "MEMBER_OF",
      fromId: meId,
      toId: id,
      weight: guildWeight(members),
    });
  }

  return { nodes, edges };
}

/** Small servers are flatly strong; past that, worth decays with size. */
export function guildWeight(members: number): number {
  if (members <= SMALL_SERVER) return 0.9;
  return Math.min(0.9, 4 / Math.log2(members + 2));
}
