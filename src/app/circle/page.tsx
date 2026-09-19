import { loadCircle } from "@/lib/world";
import CircleView from "./CircleView";

export const dynamic = "force-dynamic";

/**
 * The data is fetched here and handed down, so `?now=2026-12-31` is just a
 * search param the server reads — no client state, no refetch.
 */
export default async function CirclePage({
  searchParams,
}: {
  searchParams: Promise<{ now?: string }>;
}) {
  const { now } = await searchParams;
  const circle = await loadCircle(now);
  return (
    <div className="pt-8">
      <h1 className="font-display text-3xl">Your circle</h1>
      <p className="mt-1 text-inkSoft">
        Thickness is how much you&rsquo;ve done together. Colour is how recent.
      </p>
      <CircleView {...circle} />
    </div>
  );
}
