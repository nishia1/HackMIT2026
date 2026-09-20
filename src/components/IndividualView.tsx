"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ExportHighlightsButton from "@/components/ExportHighlightsButton";
import IndividualGraph from "@/components/IndividualGraph";
import { getIndividualName } from "@/lib/individualNames";

/** The individual connection screen (Figma node 26:3081, "2 ppl") for a loop clicked in the circle's "Individual" tab. */
export default function IndividualView({ id }: { id: string }) {
  const router = useRouter();
  const otherName = getIndividualName(id);

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
          otherName={otherName}
          footer={<ExportHighlightsButton onClick={() => router.push(`/individual/${id}/highlights`)} />}
        />
      </div>
    </div>
  );
}
