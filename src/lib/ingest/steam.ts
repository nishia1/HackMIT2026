import type { GEdge, GNode } from "@/lib/graph/types";

/**
 * STEAM INGEST
 *
 * There is deliberately no "Sign in with Steam" here. Steam authenticates with
 * OpenID 2.0 — not OAuth2, not OIDC, a dead spec no current auth library
 * supports — so building it means hand-rolling a signature-verification flow.
 * We don't have to: Discord already knows the user's steamID64, because for a
 * connection of type "steam" the connection id *is* the steamID64. So we take
 * it from there (see ./discord.ts) and call the Steam Web API server-side with
 * our own key.
 *
 * Every function here is server-only — STEAM_API_KEY must never reach a client
 * bundle.
 */

const API = "https://api.steampowered.com";

export interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number; // minutes
  img_icon_url?: string;
}

/** Under two hours is a game someone bounced off, not one they play. */
const MIN_MINUTES = 120;

/**
 * Games so widely owned that sharing one is noise. Same reasoning as the
 * Discord member cap: these are dropped, never down-weighted.
 */
const UBIQUITOUS_APPIDS = new Set([
  730, // Counter-Strike 2
  570, // Dota 2
  1172470, // Apex Legends
  578080, // PUBG
  271590, // Grand Theft Auto V
  440, // Team Fortress 2
]);

function apiKey(): string {
  const key = process.env.STEAM_API_KEY;
  if (!key) throw new Error("[steam] STEAM_API_KEY is not set");
  return key;
}

async function steamGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams({ key: apiKey(), ...params });
  const res = await fetch(`${API}${path}?${qs}`);
  if (!res.ok) {
    throw new Error(`[steam] GET ${path} → ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

/**
 * Check this before trusting an empty library.
 *
 * GetOwnedGames honors profile privacy by returning an empty response rather
 * than an error, so "private profile" and "owns no games" are indistinguishable
 * from its output alone. communityvisibilitystate === 3 means public.
 */
export async function isLibraryPublic(steamId64: string): Promise<boolean> {
  const data = await steamGet<{
    response: { players: { communityvisibilitystate?: number }[] };
  }>("/ISteamUser/GetPlayerSummaries/v2/", { steamids: steamId64 });

  const player = data.response?.players?.[0];
  return player?.communityvisibilitystate === 3;
}

export async function fetchOwnedGames(steamId64: string): Promise<SteamGame[]> {
  const data = await steamGet<{ response: { games?: SteamGame[] } }>(
    "/IPlayerService/GetOwnedGames/v1/",
    { steamid: steamId64, include_appinfo: "true", include_played_free_games: "true" },
  );
  return data.response?.games ?? [];
}

/**
 * GAME nodes plus your PLAYS edges to them.
 *
 * Barely-played and ubiquitous games are dropped, not down-weighted, for the
 * same reason huge Discord servers are. rarity() in src/lib/graph/core.ts
 * scores by degree *in our graph*: if only two of our users own CS2, the graph
 * reads it as maximally rare and it outranks a genuinely narrow shared
 * interest. Edge weight can't fix that — it only feeds meanWeight, while the
 * rarity term still sees a rare node. So they never enter the graph.
 */
export function gamesToGraph(
  meId: string,
  games: SteamGame[],
): { nodes: GNode[]; edges: GEdge[] } {
  const nodes: GNode[] = [];
  const edges: GEdge[] = [];

  for (const game of games) {
    if (game.playtime_forever < MIN_MINUTES) continue;
    if (UBIQUITOUS_APPIDS.has(game.appid)) continue;

    const hours = Math.round(game.playtime_forever / 60);
    const id = `steam:${game.appid}`;
    nodes.push({
      id,
      type: "GAME",
      name: game.name,
      emoji: "🎮",
      meta: { appid: game.appid, hours, source: "steam" },
    });
    edges.push({
      id: `e:${meId}:plays:${id}`,
      type: "PLAYS",
      fromId: meId,
      toId: id,
      weight: gameWeight(hours),
    });
  }

  return { nodes, edges };
}

/** Hours played, log-scaled: 500 hours is more than 50, but not ten times more. */
export function gameWeight(hours: number): number {
  return clamp(Math.log2(hours + 1) / 8, 0.1, 0.95);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
