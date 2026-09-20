"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ExportHighlightsButton from "@/components/ExportHighlightsButton";
import IndividualGraph from "@/components/IndividualGraph";
import type { PhotoTile } from "@/lib/types";

/**
 * The individual connection screen (Figma node 26:3081, "2 ppl") for a loop
 * clicked in the circle's "Individual" tab. `id` is the person's real id and
 * `name` is their real name, both resolved by the page above.
 */
export default function IndividualView({
  id,
  name,
  photos,
}: {
  id: string;
  name: string;
  photos: PhotoTile[];
}) {
  const router = useRouter();

  return (
    <div className="pt-6">
      <Link href="/circle" className="text-inkSoft underline">
        &larr; Back to your circle
      </Link>
      {/*
        Full-bleed, same as the group graph: breaks out of the page's narrow
        column so it gets the whole screen width.
      */}
      <div className="relative left-1/2 mt-4 w-screen -translate-x-1/2">
        <IndividualGraph
          otherName={name}
          photos={photos}
          footer={<ExportHighlightsButton onClick={() => router.push(`/individual/${id}/highlights`)} />}
        />
      </div>
    </div>
  );
}
