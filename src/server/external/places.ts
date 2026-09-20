/**
 * REAL PLACES, NO API KEY.
 *
 * OpenStreetMap via Overpass, geocoded through Nominatim. Both are free,
 * keyless and community-run, which is the whole reason they're the default —
 * nothing here needs a credit card on the morning of a hackathon.
 *
 * Why this matters more than an events API: almost every plan two friends
 * make is a *place*, not a ticketed event. "Get dinner somewhere" is filler;
 * "ramen at Santouka" is a plan. This is what turns one into the other.
 *
 * Everything here fails soft. A dead Overpass mirror returns an empty list and
 * the planner carries on without named venues — never an error on screen.
 */

const OVERPASS = "https://overpass-api.de/api/interpreter";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";

// Nominatim's usage policy requires a real identifying User-Agent.
const UA = "InvisibleString/0.1 (HackMIT 2026 project)";

export type Place = {
  name: string;
  kind: string; // our vocabulary, not OSM's
  /**
   * What it actually serves or is — "ramen", "pizza", "climbing".
   *
   * `kind` is too coarse to plan with: a ramen shop and a pizzeria are both
   * "food", and without this the model writes "grab ramen at Romanza
   * Pizzaria". This is the field that stops that.
   */
  detail: string | null;
  area: string | null; // suburb / neighbourhood when OSM has one
  priceHint: "free" | "cheap" | "mid" | "splurge";
};

type LatLon = { lat: number; lon: number };

/**
 * OSM tag filters, keyed by words people actually type into a profile.
 *
 * This table is also the security boundary: user text is matched *against*
 * these keys and never interpolated into the Overpass query. An interest of
 * `"];out;//"` finds nothing rather than rewriting the query.
 */
const INTEREST_TAGS: Record<string, { filter: string; kind: string; price: Place["priceHint"] }> = {
  ramen: { filter: '["amenity"="restaurant"]["cuisine"~"ramen|japanese",i]', kind: "food", price: "cheap" },
  sushi: { filter: '["amenity"="restaurant"]["cuisine"~"sushi|japanese",i]', kind: "food", price: "mid" },
  pizza: { filter: '["amenity"="restaurant"]["cuisine"~"pizza",i]', kind: "food", price: "cheap" },
  tacos: { filter: '["amenity"="restaurant"]["cuisine"~"mexican|taco",i]', kind: "food", price: "cheap" },
  korean: { filter: '["amenity"="restaurant"]["cuisine"~"korean",i]', kind: "food", price: "mid" },
  thai: { filter: '["amenity"="restaurant"]["cuisine"~"thai",i]', kind: "food", price: "cheap" },
  vegan: { filter: '["amenity"="restaurant"]["diet:vegan"~"yes|only",i]', kind: "food", price: "mid" },
  dessert: { filter: '["amenity"~"ice_cream|cafe"]["cuisine"~"ice_cream|dessert",i]', kind: "food", price: "cheap" },
  bakery: { filter: '["shop"="bakery"]', kind: "food", price: "cheap" },
  coffee: { filter: '["amenity"="cafe"]', kind: "coffee", price: "cheap" },
  tea: { filter: '["amenity"="cafe"]["cuisine"~"tea|bubble_tea",i]', kind: "coffee", price: "cheap" },
  drinks: { filter: '["amenity"~"^(bar|pub)$"]', kind: "drinks", price: "mid" },
  bouldering: { filter: '["sport"="climbing"]', kind: "sport", price: "mid" },
  climbing: { filter: '["sport"="climbing"]', kind: "sport", price: "mid" },
  swimming: { filter: '["leisure"="swimming_pool"]', kind: "sport", price: "cheap" },
  gym: { filter: '["leisure"="fitness_centre"]', kind: "sport", price: "mid" },
  running: { filter: '["leisure"="park"]', kind: "outdoors", price: "free" },
  hiking: { filter: '["leisure"="nature_reserve"]', kind: "outdoors", price: "free" },
  walks: { filter: '["leisure"="park"]', kind: "outdoors", price: "free" },
  parks: { filter: '["leisure"="park"]', kind: "outdoors", price: "free" },
  museums: { filter: '["tourism"="museum"]', kind: "art", price: "cheap" },
  art: { filter: '["tourism"~"gallery|museum"]', kind: "art", price: "cheap" },
  pottery: { filter: '["craft"="pottery"]', kind: "art", price: "mid" },
  film: { filter: '["amenity"="cinema"]', kind: "art", price: "mid" },
  cinema: { filter: '["amenity"="cinema"]', kind: "art", price: "mid" },
  photography: { filter: '["shop"="photo"]', kind: "art", price: "cheap" },
  "live music": { filter: '["amenity"~"^(bar|pub|nightclub)$"]["live_music"="yes"]', kind: "music", price: "mid" },
  music: { filter: '["amenity"~"nightclub|bar"]', kind: "music", price: "mid" },
  karaoke: { filter: '["amenity"="nightclub"]', kind: "music", price: "mid" },
  "board games": { filter: '["shop"="games"]', kind: "games", price: "cheap" },
  games: { filter: '["leisure"="amusement_arcade"]', kind: "games", price: "cheap" },
  books: { filter: '["shop"="books"]', kind: "study", price: "free" },
  reading: { filter: '["amenity"="library"]', kind: "study", price: "free" },
  study: { filter: '["amenity"="library"]', kind: "study", price: "free" },
};

/** Fallback when no interest matches — keyed on what they already do together. */
const KIND_TAGS: Record<string, { filter: string; price: Place["priceHint"] }> = {
  food: { filter: '["amenity"="restaurant"]', price: "mid" },
  coffee: { filter: '["amenity"="cafe"]', price: "cheap" },
  drinks: { filter: '["amenity"~"^(bar|pub)$"]', price: "mid" },
  outdoors: { filter: '["leisure"="park"]', price: "free" },
  music: { filter: '["amenity"~"nightclub|bar"]', price: "mid" },
  sport: { filter: '["leisure"="fitness_centre"]', price: "mid" },
  study: { filter: '["amenity"="library"]', price: "free" },
  art: { filter: '["tourism"~"gallery|museum"]', price: "cheap" },
  games: { filter: '["leisure"="amusement_arcade"]', price: "cheap" },
};

const BUDGET_RANK = { free: 0, cheap: 1, mid: 2, splurge: 3 } as const;

const geoCache = new Map<string, LatLon | null>();

/**
 * City name → coordinates. Cached, because Nominatim asks for 1 req/sec.
 *
 * Give it a region: bare "Cambridge" resolves to Cambridge, England, and you
 * get a list of University of Cambridge museums for a user in Massachusetts.
 * The profile screen asks for "City, State" for exactly this reason.
 */
export async function geocode(city: string): Promise<LatLon | null> {
  const key = city.trim().toLowerCase();
  if (!key) return null;
  if (geoCache.has(key)) return geoCache.get(key)!;

  try {
    const url = `${NOMINATIM}?q=${encodeURIComponent(city)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const [hit] = (await res.json()) as { lat: string; lon: string }[];
    const out = hit ? { lat: Number(hit.lat), lon: Number(hit.lon) } : null;
    geoCache.set(key, out);
    return out;
  } catch {
    geoCache.set(key, null);
    return null;
  }
}

/**
 * Named places near a city that fit what these two like and can afford.
 *
 * Interests come first — a shared interest is a better plan than a generic
 * one — with their usual event kinds as backfill.
 */
export async function findPlaces({
  city,
  interests,
  kinds = [],
  budget = "splurge",
  radiusMetres = 4000,
  limit = 12,
}: {
  city: string | null;
  interests: string[];
  kinds?: string[];
  budget?: Place["priceHint"];
  radiusMetres?: number;
  limit?: number;
}): Promise<Place[]> {
  if (!city) return [];

  const ceiling = BUDGET_RANK[budget];
  const selected: { filter: string; kind: string; price: Place["priceHint"] }[] = [];
  const seenFilters = new Set<string>();

  const take = (entry: { filter: string; kind: string; price: Place["priceHint"] }) => {
    if (BUDGET_RANK[entry.price] > ceiling) return; // can't afford it, don't suggest it
    if (seenFilters.has(entry.filter)) return;
    seenFilters.add(entry.filter);
    selected.push(entry);
  };

  for (const interest of interests) {
    const entry = INTEREST_TAGS[interest.trim().toLowerCase()];
    if (entry) take(entry);
  }
  for (const kind of kinds) {
    const entry = KIND_TAGS[kind];
    if (entry) take({ ...entry, kind });
  }
  if (selected.length === 0) return [];

  const here = await geocode(city);
  if (!here) return [];

  const around = `(around:${radiusMetres},${here.lat},${here.lon})`;
  const clauses = selected
    .slice(0, 6) // a wider union times out on the public mirror
    .map((s) => `nwr${s.filter}${around};`)
    .join("\n  ");
  // Ask for far more than we need. Overpass returns the union in no useful
  // order, and parks and playgrounds are so abundant in OSM that a tight cap
  // fills entirely with them — you ask for ramen and get twelve playgrounds.
  // We over-fetch, then round-robin by kind below.
  const query = `[out:json][timeout:20];\n(\n  ${clauses}\n);\nout tags center 300;`;

  let elements: { tags?: Record<string, string> }[];
  try {
    const res = await fetch(OVERPASS, {
      method: "POST",
      headers: { "Content-Type": "text/plain", "User-Agent": UA },
      body: query,
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(String(res.status));
    ({ elements } = (await res.json()) as { elements: { tags?: Record<string, string> }[] });
  } catch {
    return []; // Overpass is community-run and sometimes just says no.
  }

  const byName = new Map<string, Place>();
  for (const el of elements ?? []) {
    const tags = el.tags ?? {};
    const name = tags.name?.trim();
    if (!name || byName.has(name)) continue;

    byName.set(name, {
      name,
      kind: kindFromTags(tags, selected[0]?.kind ?? "other"),
      detail: detailFromTags(tags),
      area: tags["addr:suburb"] ?? tags["addr:city"] ?? null,
      priceHint: priceFromTags(tags, selected[0]?.price ?? "mid"),
    });
  }

  return roundRobinByKind(
    rankByInterest([...byName.values()], interests),
    selected.map((s) => s.kind),
    limit,
  );
}

/**
 * Within a kind, a place that matches the actual interest wins.
 *
 * "Ramen" and "pizza" are both kind `food`, and Overpass returns the union in
 * no useful order — so without this, asking for ramen gets you whichever
 * restaurant happened to come back first. Matching on the cuisine tag (and the
 * name, for places like "Ittou Noodle Bar") pulls the right one to the front.
 */
function rankByInterest(places: Place[], interests: string[]): Place[] {
  const words = interests
    .flatMap((i) => i.toLowerCase().split(/\s+/))
    .filter((w) => w.length > 2);

  const score = (p: Place) => {
    const haystack = `${p.detail ?? ""} ${p.name}`.toLowerCase();
    return words.some((w) => haystack.includes(w)) ? 1 : 0;
  };

  return [...places].sort((a, b) => score(b) - score(a));
}

/**
 * One from each kind, then a second from each, and so on.
 *
 * Without this a plentiful category swallows the whole list and the planner
 * never sees a restaurant. Interest order is preserved, so the kinds both
 * friends actually share get picked first.
 */
function roundRobinByKind(places: Place[], preferredOrder: string[], limit: number): Place[] {
  const buckets = new Map<string, Place[]>();
  for (const p of places) {
    const bucket = buckets.get(p.kind) ?? [];
    bucket.push(p);
    buckets.set(p.kind, bucket);
  }

  // Preferred kinds first, then anything else OSM handed back. Deduped:
  // several interests collapse to one kind (ramen and pizza are both "food"),
  // and a repeated kind would draw the same place out of its bucket twice.
  const order = [
    ...new Set([
      ...preferredOrder.filter((k) => buckets.has(k)),
      ...buckets.keys(),
    ]),
  ];

  const out: Place[] = [];
  for (let round = 0; out.length < limit; round++) {
    let addedAny = false;
    for (const kind of order) {
      const pick = buckets.get(kind)?.[round];
      if (!pick) continue;
      out.push(pick);
      addedAny = true;
      if (out.length >= limit) break;
    }
    if (!addedAny) break;
  }
  return out;
}

/** OSM's own words for the thing, cleaned up. `cuisine` is the useful one. */
function detailFromTags(tags: Record<string, string>): string | null {
  const raw =
    tags.cuisine?.split(";")[0] ??
    tags.sport?.split(";")[0] ??
    tags.craft ??
    tags.tourism ??
    tags.shop ??
    tags.leisure ??
    tags.amenity ??
    null;
  return raw ? raw.replace(/_/g, " ") : null;
}

function kindFromTags(tags: Record<string, string>, fallback: string): string {
  if (tags.amenity === "cafe") return "coffee";
  if (tags.amenity === "restaurant" || tags.shop === "bakery") return "food";
  if (tags.amenity === "bar" || tags.amenity === "pub") return "drinks";
  if (tags.amenity === "nightclub") return "music";
  if (tags.amenity === "cinema" || tags.tourism) return "art";
  if (tags.amenity === "library") return "study";
  if (tags.leisure === "park" || tags.leisure === "nature_reserve") return "outdoors";
  if (tags.sport || tags.leisure === "fitness_centre") return "sport";
  return fallback;
}

/**
 * OSM has no reliable price field, so this is a heuristic and named like one.
 * If you add Google Places later, its `price_level` replaces this outright.
 */
function priceFromTags(tags: Record<string, string>, fallback: Place["priceHint"]): Place["priceHint"] {
  if (tags.fee === "no" || tags.leisure === "park" || tags.amenity === "library") return "free";
  if (tags.amenity === "cafe" || tags.shop === "bakery") return "cheap";
  return fallback;
}
