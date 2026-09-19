"use client";
import { useState } from "react";
import Link from "next/link";
import GraphCanvas from "@/components/GraphCanvas";
import NudgeCard from "@/components/NudgeCard";
import StringCard from "@/components/StringCard";
import type { Nudge, StringView } from "@/lib/types";

export default function CircleView({
  now,
  strings,
  nudges,
}: {
  now: string;
  strings: StringView[];
  nudges: Nudge[];
}) {
  const [selected, setSelected] = useState<StringView | null>(null);

  if (strings.length === 0) {
    return (
      <p className="mt-8 rounded-lg border border-dashed border-ink/20 p-6 text-inkSoft">
        No strings yet. Add an event, or import your camera roll, and they appear here.
      </p>
    );
  }

  return (
    <>
      <div className="-mx-2 mt-2">
        <GraphCanvas
          strings={strings}
          selectedId={selected?.personId ?? null}
          onSelect={setSelected}
        />
      </div>

      {selected ? (
        <StringCard string={selected} href={`/card/${selected.personId}`} now={now} />
      ) : (
        <p className="rounded-lg border border-dashed border-ink/20 p-4 text-inkSoft">
          Tap a string to open it.
        </p>
      )}

      {nudges.length > 0 && (
        <section className="mt-8 space-y-4">
          <NudgeCard nudge={nudges[0]} />
          {nudges.slice(1).map((n) => (
            <p key={n.personId} className="text-inkSoft">
              {n.line}{" "}
              <Link href={`/card/${n.personId}`} className="underline">
                open
              </Link>
            </p>
          ))}
        </section>
      )}

      <p className="mt-10 text-sm text-inkSoft">
        Showing {now.slice(0, 10)}. Add <code>?now=2026-12-31</code> to see it fade.
      </p>
    </>
  );
}
