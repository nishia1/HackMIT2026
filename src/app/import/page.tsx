import ImportView from "@/app/import/ImportView";
import { getPeople } from "@/lib/world";
import { recentCompanions } from "@/server/services/events";
import { requireUserId } from "@/server/services/session";
import { findById } from "@/server/repo/users";

export const dynamic = "force-dynamic";

/**
 * People, ordered the way you are about to need them: whoever you saw most
 * recently first. Tagging is the one manual step in the import, so the chip
 * you want should already be under your thumb.
 */
export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const meId = await requireUserId();
  const [me, people, { error }] = await Promise.all([
    findById(meId),
    getPeople(),
    searchParams,
  ]);

  // No history yet just means we keep the order we were given — there is
  // nothing to learn from until the first import lands.
  const recent = await recentCompanions(meId).catch(() => [] as string[]);
  const rank = new Map(recent.map((id, i) => [id, i]));
  const original = new Map(people.map((p, i) => [p.id, i]));

  const ordered = [...people].sort((a, b) => {
    const ra = rank.get(a.id) ?? Infinity;
    const rb = rank.get(b.id) ?? Infinity;
    if (ra !== rb) return ra - rb;
    return original.get(a.id)! - original.get(b.id)!;
  });

  return (
    <ImportView
      people={ordered}
      me={{ name: me?.name ?? "You" }}
      connection={{ folder: me?.dropbox?.folder ?? null }}
      initialError={error ?? null}
    />
  );
}
