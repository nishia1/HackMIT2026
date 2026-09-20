import ImportView from "@/app/import/ImportView";
import { getPeople } from "@/lib/world";
import { recentCompanions } from "@/server/services/events";

export const dynamic = "force-dynamic";

/**
 * People, ordered the way you are about to need them: whoever you saw most
 * recently first. Tagging is the one manual step in the import, so the chip
 * you want should already be under your thumb.
 */
export default async function ImportPage() {
  const people = await getPeople();

  // No database, or a cold one, just means we keep the world's own order —
  // which is already sorted by how strong the string is, so it is a decent
  // second guess at who you were with.
  const recent = await recentCompanions().catch(() => [] as string[]);
  const rank = new Map(recent.map((id, i) => [id, i]));
  const original = new Map(people.map((p, i) => [p.id, i]));

  const ordered = [...people].sort((a, b) => {
    const ra = rank.get(a.id) ?? Infinity;
    const rb = rank.get(b.id) ?? Infinity;
    if (ra !== rb) return ra - rb;
    return original.get(a.id)! - original.get(b.id)!;
  });

  return <ImportView people={ordered} />;
}
