"use client";
import Thread from "./Thread";
import type { PersonView } from "@/lib/world";

/**
 * The collectible layer. A card gets denser as the relationship does — more
 * threads across the header, more shared things listed — but it never shows a
 * level or a number out of ten. It should read as a scrapbook page, not a stat
 * block.
 */
export default function ConnectionCard({
  view,
  animate = true,
}: {
  view: PersonView;
  animate?: boolean;
}) {
  const { person, strands, upcoming, headline } = view;
  const tier =
    strands.length >= 5 ? "Deeply strung" : strands.length >= 3 ? "Strung" : "One thread";

  return (
    <article className="overflow-hidden rounded-xl border border-ink/20 bg-paper">
      <div className="relative h-24 border-b border-ink/15 bg-paperDeep/60">
        <svg viewBox="0 0 320 96" className="h-full w-full" aria-hidden>
          {strands.map((_, i) => (
            <Thread
              key={i}
              x1={12}
              y1={20 + i * 12}
              x2={308}
              y2={76 - i * 9}
              strength={1 - i * 0.12}
              animate={animate}
              delay={i * 120}
            />
          ))}
        </svg>
        <span className="absolute bottom-2 right-3 text-sm text-inkSoft">{tier}</span>
      </div>

      <div className="p-5">
        <h2 className="font-display text-2xl">
          {person.emoji} {person.name}
        </h2>
        <p className="mt-2 font-display text-lg leading-snug">{headline}</p>

        <ul className="mt-4 space-y-2">
          {strands.map((s, i) => (
            <li key={i} className="flex gap-3 border-t border-ink/10 pt-2">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-string" />
              <span>{s.phrasing}</span>
            </li>
          ))}
        </ul>

        {upcoming.length > 0 && (
          <div className="mt-5 rounded-lg border border-field/40 p-3">
            <p className="font-display">You&rsquo;re both going to</p>
            <p className="text-inkSoft">
              {upcoming.map((e) => `${e.emoji ?? ""} ${e.name}`).join(" · ")}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
