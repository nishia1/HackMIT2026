import Link from "next/link";
import StringCard from "@/components/StringCard";
import { loadString } from "@/lib/world";

export const dynamic = "force-dynamic";

export default async function CardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ now?: string }>;
}) {
  const [{ id }, { now }] = await Promise.all([params, searchParams]);
  const string = await loadString(id, now);

  if (!string) {
    return (
      <div className="pt-16">
        <h1 className="font-display text-3xl">No string here</h1>
        <Link href="/circle" className="mt-3 inline-block underline">
          Back to your circle
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-8">
      <StringCard string={string} now={now} />

      <section className="mt-8">
        <h2 className="font-display text-xl">Stamps</h2>
        {string.stamps.length === 0 ? (
          <p className="mt-2 text-inkSoft">Nothing on this string yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {string.stamps.map((stamp) => (
              <li
                key={stamp.eventId}
                className="flex gap-3 border-t border-ink/10 pt-3"
              >
                <span className="text-2xl">{stamp.emoji}</span>
                <span className="flex-1">
                  <span className="font-display">{stamp.title}</span>
                  <span className="block text-sm text-inkSoft">
                    {stamp.happenedAt.slice(0, 10)} · {stamp.kind}
                  </span>
                  {stamp.caption && <span className="block">{stamp.caption}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
