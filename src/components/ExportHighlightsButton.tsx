"use client";

import PillButton from "@/components/PillButton";

/** Opens this week's highlights card for the group chat. */
export default function ExportHighlightsButton({ onClick }: { onClick?: () => void }) {
  return <PillButton onClick={onClick}>EXPORT THIS WEEK&rsquo;S HIGHLIGHTS</PillButton>;
}
