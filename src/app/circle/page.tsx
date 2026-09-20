"use client";

import { useState } from "react";
import GroupIndividualToggle, { type ViewMode } from "@/components/GroupIndividualToggle";
import InfiniteMainString from "@/components/InfiniteMainString";

export default function CirclePage() {
  const [mode, setMode] = useState<ViewMode>("group");

  return (
    <div>
      <div className="sticky top-4 z-30 flex justify-center">
        <GroupIndividualToggle mode={mode} onChange={setMode} />
      </div>
      <InfiniteMainString mode={mode} />
    </div>
  );
}
