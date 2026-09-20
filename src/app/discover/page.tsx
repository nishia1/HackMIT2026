import { loadDiscoveries } from "@/lib/world";

export const dynamic = "force-dynamic";

/**
 * A side tab. Three and four friendships out, ranked by how many separate
 * chains reach someone — one chain is a coincidence, four is a social circle
 * you're standing next to.
 */
export default async function DiscoverPage() {
  const people = await loadDiscoveries();

  return (
    <div className="pt-8">
      <h1 className="font-display text-3xl">Discover</h1>
      <p className="mt-1 text-inkSoft">
        People three or four friendships away. You haven&rsquo;t met any of them.
      </p>

      {people.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-ink/20 p-6 text-inkSoft">
          Nobody that far out yet.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {people.map((p) => (
            <li key={p.personId} className="rounded-lg border border-ink/15 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-display text-lg">{p.name}</span>
                <span className="text-sm text-inkSoft">
                  {p.degree} hops · {p.pathCount}{" "}
                  {p.pathCount === 1 ? "chain" : "chains"}
                </span>
              </div>
              <p className="mt-1 text-inkSoft">Through {p.via.join(" → ")}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
