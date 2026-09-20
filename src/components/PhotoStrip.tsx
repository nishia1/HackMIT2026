import { stampsFor } from "@/server/services/events";
import { isDbConfigured } from "@/server/db/client";

/**
 * What you actually came to the card for. The strings say you know someone;
 * this says what that looked like.
 *
 * A server component, so the photos are on the page at first paint rather
 * than arriving after a spinner.
 */

const when = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export default async function PhotoStrip({ personId }: { personId: string }) {
  if (!isDbConfigured()) return null;

  let stamps;
  try {
    stamps = await stampsFor(personId);
  } catch {
    // A card that loses its photos is still a card. Never blank the page.
    return null;
  }

  if (stamps.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="font-display text-xl">
        {stamps.length === 1 ? "One photo together" : `${stamps.length} photos together`}
      </h2>

      <div className="mt-3 flex snap-x gap-3 overflow-x-auto pb-2">
        {stamps.map((s, i) => (
          <figure key={`${s.eventId}-${i}`} className="w-40 shrink-0 snap-start">
            {/* Not next/image: these are proxied bytes, not a known-size asset. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.src}
              alt={s.caption ?? s.title}
              loading="lazy"
              className="h-40 w-40 rounded-lg border border-ink/15 object-cover"
            />
            <figcaption className="mt-1 text-xs text-inkSoft">
              {s.emoji} {s.title} · {when(s.happenedAt)}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
