import candidateEvents from "@/data/candidateEvents.json";

/**
 * TICKETED EVENTS.
 *
 * Ticketmaster's Discovery API is the only mainstream event source with a
 * genuinely free tier and no approval step — Eventbrite removed public search
 * in 2019, Meetup went paid, and Facebook's event endpoints are all behind
 * App Review. So: Ticketmaster when there's a key, plus a small hand-written
 * list of campus events, which is also the thing that still works on stage
 * when the venue wifi eats an outbound call.
 *
 * Fails soft, like places.ts. No key means no ticketed events, not an error.
 */

const TM = "https://app.ticketmaster.com/discovery/v2/events.json";

export type EventIdea = {
  name: string;
  kind: string;
  when: string | null; // ISO date, when we know it
  venue: string | null;
  priceHint: "free" | "cheap" | "mid" | "splurge";
  url: string | null;
  /** Only set on the hand-written ones, which are city-specific. */
  city?: string;
};

/** Our vocabulary ← Ticketmaster's segment names. */
const SEGMENT_KIND: Record<string, string> = {
  Music: "music",
  Sports: "sport",
  "Arts & Theatre": "art",
  Film: "art",
  Miscellaneous: "other",
};

/** Interests worth asking Ticketmaster about. Everything else is a place. */
const CLASSIFICATION: Record<string, string> = {
  "live music": "music",
  music: "music",
  concerts: "music",
  comedy: "arts & theatre",
  theatre: "arts & theatre",
  theater: "arts & theatre",
  art: "arts & theatre",
  film: "film",
  cinema: "film",
  sport: "sports",
  sports: "sports",
  basketball: "sports",
  football: "sports",
  hockey: "sports",
};

export function ticketmasterAvailable() {
  return Boolean(process.env.TICKETMASTER_API_KEY);
}

export async function findEvents({
  city,
  interests,
  budget = "splurge",
  limit = 8,
}: {
  city: string | null;
  interests: string[];
  budget?: EventIdea["priceHint"];
  limit?: number;
}): Promise<EventIdea[]> {
  const local = localEvents(city, budget);

  const key = process.env.TICKETMASTER_API_KEY;
  if (!key || !city) return local.slice(0, limit);

  // A free event beats a ticketed one on a tight budget, so don't even ask.
  if (budget === "free") return local.slice(0, limit);

  const classifications = [
    ...new Set(
      interests
        .map((i) => CLASSIFICATION[i.trim().toLowerCase()])
        .filter((c): c is string => Boolean(c)),
    ),
  ];

  // Profiles carry "Cambridge, MA" so Nominatim doesn't send us to England,
  // but Ticketmaster's `city` wants the bare name.
  const params = new URLSearchParams({
    apikey: key,
    city: city.split(",")[0].trim(),
    size: String(limit),
    sort: "date,asc",
    startDateTime: new Date().toISOString().slice(0, 19) + "Z",
  });
  if (classifications.length) params.set("classificationName", classifications.join(","));

  try {
    const res = await fetch(`${TM}?${params}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as {
      _embedded?: {
        events?: {
          name: string;
          url?: string;
          dates?: { start?: { dateTime?: string; localDate?: string } };
          classifications?: { segment?: { name?: string } }[];
          priceRanges?: { min?: number }[];
          _embedded?: { venues?: { name?: string }[] };
        }[];
      };
    };

    const remote: EventIdea[] = (json._embedded?.events ?? []).map((e) => ({
      name: e.name,
      kind: SEGMENT_KIND[e.classifications?.[0]?.segment?.name ?? ""] ?? "other",
      when: e.dates?.start?.dateTime ?? e.dates?.start?.localDate ?? null,
      venue: e._embedded?.venues?.[0]?.name ?? null,
      priceHint: priceFrom(e.priceRanges?.[0]?.min),
      url: e.url ?? null,
    }));

    // Interleaved, not concatenated. The hand-written campus list is long
    // enough to fill `limit` on its own, so appending real ticketed events
    // after it meant they were always sliced off and never reached the model.
    return interleave(affordable(remote, budget), local, limit);
  } catch {
    return local.slice(0, limit);
  }
}

/** Alternates a and b, a first, until `limit`. Exhausted lists are skipped. */
function interleave<T>(a: T[], b: T[], limit: number): T[] {
  const out: T[] = [];
  for (let i = 0; out.length < limit && (i < a.length || i < b.length); i++) {
    if (i < a.length) out.push(a[i]);
    if (out.length < limit && i < b.length) out.push(b[i]);
  }
  return out;
}

const RANK = { free: 0, cheap: 1, mid: 2, splurge: 3 } as const;

function affordable(events: EventIdea[], budget: EventIdea["priceHint"]) {
  return events.filter((e) => RANK[e.priceHint] <= RANK[budget]);
}

function priceFrom(min: number | undefined): EventIdea["priceHint"] {
  if (min === undefined) return "mid";
  if (min === 0) return "free";
  if (min < 15) return "cheap";
  if (min < 40) return "mid";
  return "splurge";
}

/**
 * Hand-written campus events. Edit `src/data/candidateEvents.json` — it's the
 * cheapest way to make the demo feel local, and it never goes down.
 */
function localEvents(city: string | null, budget: EventIdea["priceHint"]): EventIdea[] {
  const now = Date.now();
  const here = city?.trim().toLowerCase();

  const usable = (candidateEvents as EventIdea[]).filter((e) => {
    // These are real, specific places. Offering a Harvard gallery night to
    // someone in Seattle is worse than offering them nothing.
    if (!here || e.city?.toLowerCase() !== here) return false;
    // A null `when` means it recurs — "every Thursday" — so it never expires.
    return !e.when || new Date(e.when).getTime() > now;
  });

  return affordable(usable, budget);
}
