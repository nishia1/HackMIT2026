import Link from "next/link";
import IndividualHighlightsCard from "@/components/IndividualHighlightsCard";
import { PHOTO_SLOTS } from "@/components/IndividualGraph";
import { loadPhotosWith, loadString } from "@/lib/world";

export const dynamic = "force-dynamic";

export default async function IndividualHighlightsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const string = await loadString(id);

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
  return <IndividualHighlightsCard id={id} otherName={string.name} photos={photos} />;
}
