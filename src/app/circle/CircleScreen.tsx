"use client";

import { useState } from "react";
import GroupIndividualToggle, { type ViewMode } from "@/components/GroupIndividualToggle";
import InfiniteMainString from "@/components/InfiniteMainString";
import type { Loop } from "@/lib/types";

/**
 * The circle, once its data has been fetched. Only the GROUP/INDIVIDUAL
 * choice lives here — the loops themselves are loaded on the server, so
 * `?now=` stays a search param the page reads rather than client state.
 */
export default function CircleScreen({ loops }: { loops: Loop[] }) {
  const [mode, setMode] = useState<ViewMode>("group");

  return (
    <div>
      <div className="sticky top-4 z-30 flex justify-center">
        <GroupIndividualToggle mode={mode} onChange={setMode} />
      </div>
      <InfiniteMainString mode={mode} loops={loops} />
    </div>
  );
}
