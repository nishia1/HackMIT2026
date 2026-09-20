import { loadCircleLoops } from "@/lib/world";
import CircleScreen from "./CircleScreen";

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
  const { loops, nudges } = await loadCircleLoops(now);
  return <CircleScreen loops={loops} nudges={nudges} />;
}
