"use client";
import { useState } from "react";
import Link from "next/link";
import GraphCanvas from "@/components/GraphCanvas";
import type { GNode } from "@/lib/graph/types";

export default function CircleView({
  center,
  nodes,
  links,
}: {
  center: GNode;
  nodes: GNode[];
  links: { source: string; target: string; type: string }[];
}) {
  const [selected, setSelected] = useState<GNode | null>(null);

  return (
    <>
      <div className="-mx-2 mt-2">
        <GraphCanvas center={center} nodes={nodes} links={links} onSelect={setSelected} />
      </div>

      {selected ? (
        <div className="rounded-lg border border-ink/15 bg-paper p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-xl">
              {selected.emoji} {selected.name}
            </h2>
            <span className="text-sm text-inkSoft">{selected.type.toLowerCase()}</span>
          </div>
          {selected.type === "PERSON" && selected.id !== center.id && (
            <Link
              href={`/card/${selected.id}`}
              className="mt-3 inline-block rounded-md bg-ink px-4 py-2 text-paper"
            >
              See your strings
            </Link>
          )}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-ink/20 p-4 text-inkSoft">
          Pick something to see what it connects to.
        </p>
      )}
    </>
  );
}
