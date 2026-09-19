"use client";
import { useState } from "react";
import Link from "next/link";
import ConnectionCard from "@/components/ConnectionCard";
import { usePassport } from "@/lib/passport";
import type { PersonView } from "@/lib/world";

/**
 * The screen the pitch lives on. It opens closed on purpose — the reveal only
 * works if someone taps before they see the answer.
 */
export default function ExploreView({ discoveries }: { discoveries: PersonView[] }) {
  const [opened, setOpened] = useState(false);
  const { follow, hasFollowed, ready } = usePassport();

  if (discoveries.length === 0) {
    return (
      <div className="pt-16">
        <h1 className="font-display text-3xl">Nothing loose right now</h1>
        <p className="mt-2 text-inkSoft">
          Add a class or a club in <code>src/data/world.ts</code> and new threads appear.
        </p>
      </div>
    );
  }

  const [top, ...rest] = discoveries;
  const followed = ready && hasFollowed(top.person.id);

  return (
    <div className="pt-8">
      <h1 className="font-display text-3xl">Explore</h1>

      {!opened ? (
        <button
          onClick={() => setOpened(true)}
          className="mt-6 w-full rounded-xl border border-ink/20 bg-paper p-6 text-left"
        >
          <p className="font-display text-xl leading-snug">
            There&rsquo;s someone in your world you haven&rsquo;t met.
          </p>
          <p className="mt-2 text-inkSoft">
            {top.strands.length} separate threads already reach them.
          </p>
          <span className="mt-4 inline-block rounded-md bg-string px-4 py-2 text-paper">
            Pull the thread
          </span>
        </button>
      ) : (
        <div className="mt-6">
          <ConnectionCard view={top} />
          <button
            onClick={() =>
              follow({
                personId: top.person.id,
                personName: top.person.name,
                headline: top.headline,
                path: top.strands[0]?.path.map((p) => p.name) ?? [],
              })
            }
            disabled={followed}
            className="mt-4 w-full rounded-md bg-ink px-4 py-3 text-paper disabled:opacity-60"
          >
            {followed ? "In your passport" : "Follow this string"}
          </button>
        </div>
      )}

      {rest.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl">Other threads</h2>
          <ul className="mt-3 space-y-3">
            {rest.map((r) => (
              <li key={r.person.id}>
                <Link
                  href={`/card/${r.person.id}`}
                  className="flex items-center gap-3 rounded-lg border border-ink/15 p-3"
                >
                  <span className="text-2xl">{r.person.emoji}</span>
                  <span className="flex-1">
                    <span className="font-display">{r.person.name}</span>
                    <span className="block text-inkSoft">{r.strands[0]?.phrasing}</span>
                  </span>
                  <span className="text-inkSoft">{r.strands.length}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
