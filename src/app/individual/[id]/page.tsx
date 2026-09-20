import Link from "next/link";
import IndividualView from "@/components/IndividualView";
import { PHOTO_SLOTS } from "@/components/IndividualGraph";
import { loadPhotosWith, loadString } from "@/lib/world";

export const dynamic = "force-dynamic";

/**
 * One connection's own screen. `id` is a real person id, the same one the
 * circle's individual label links to, so the name is resolved here rather
 * than guessed from the URL.
 */
export default async function IndividualPage({
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

  const photos = await loadPhotosWith(id, PHOTO_SLOTS);
  return <IndividualView id={id} name={string.name} photos={photos} />;
}
