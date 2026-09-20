"use client";
import Link from "next/link";
import { usePassport } from "@/lib/passport";

/**
 * A record, not a scoreboard. Counts are stated plainly and once; the stamps
 * carry the feeling. Each is set slightly off-square so the page reads as
 * something pressed rather than rendered.
 */
export default function PassportPage() {
  const { entries, ready, clear } = usePassport();

  if (!ready) return <p className="pt-16 text-inkSoft">Opening your passport…</p>;

  return (
    <div className="pt-8">
      <h1 className="font-display text-3xl">Your passport</h1>
      <p className="mt-1 text-inkSoft">
        {entries.length === 0
          ? "Empty for now."
          : `${entries.length} ${entries.length === 1 ? "string" : "strings"} followed.`}
      </p>

      {entries.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-ink/20 p-6">
          <p className="font-display text-lg">Nothing stamped yet.</p>
          <p className="mt-2 text-inkSoft">
            Follow a thread and the person, the places and the shared experiences all
            land here.
          </p>
          <Link
            href="/discover"
            className="mt-4 inline-block rounded-md bg-string px-4 py-2 text-paper"
          >
            Go discover
          </Link>
        </div>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="font-display text-xl">Stamps</h2>
            <div className="mt-4 flex flex-wrap gap-4">
              {entries.map((e, i) => (
                <div
                  key={e.personId}
                  className="stamp-edge rounded-sm border border-dashed px-4 py-5 text-center"
                  style={{
                    color: "var(--string)",
                    transform: `rotate(${((i * 37) % 9) - 4}deg)`,
                    minWidth: 118,
                  }}
                >
                  <span className="block text-2xl">✦</span>
                  <span className="mt-1 block font-display text-sm text-ink">
                    {e.personName}
                  </span>
                  <span className="mt-1 block text-xs text-inkSoft">
                    {new Date(e.followedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-xl">Strings you followed</h2>
            <ul className="mt-3 space-y-3">
              {entries.map((e) => (
                <li key={e.personId} className="border-t border-ink/10 pt-3">
                  <p className="font-display">{e.headline}</p>
                  <p className="text-inkSoft">{e.path.join(" → ")}</p>
                </li>
              ))}
            </ul>
          </section>

          <button onClick={clear} className="mt-10 text-sm text-inkSoft underline">
            Clear passport
          </button>
        </>
      )}
    </div>
  );
}
