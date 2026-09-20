"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PlanCard from "@/components/PlanCard";
import type { Plan } from "@/lib/types";

type PlanResponse = {
  name: string;
  plans: Plan[];
  source: "ai" | "template";
  stamps: { eventId: string; title: string; emoji: string }[];
};

/**
 * Where "Make a plan" lands: three things you could actually do with one
 * person, each grounded in something you already did together.
 *
 * Asks on mount rather than on the server, because the plan is the slow part
 * of the app — a model call and a places lookup — and a spinner on a page
 * you chose to open reads better than a page that takes five seconds to
 * arrive.
 */
export default function PlanForPerson({
  personId,
  name,
  now,
}: {
  personId: string;
  name: string;
  now?: string;
}) {
  const [data, setData] = useState<PlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/plan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ personId, now }),
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error ?? "Could not make a plan");
        setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not make a plan");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [personId, now]);

  return (
    <div className="pt-8">
      <Link href={`/individual/${personId}`} className="text-inkSoft underline">
        &larr; Back to {name}
      </Link>

      <h1 className="mt-4 font-display text-3xl">Ways to see {name}</h1>

      <div className="mt-6">
        {error ? (
          <p className="rounded-xl border border-string/40 bg-paper p-5 text-inkSoft">{error}</p>
        ) : !data ? (
          <p className="text-inkSoft">Thinking of something&hellip;</p>
        ) : (
          <>
            <PlanCard name={data.name} plans={data.plans} stamps={data.stamps} source={data.source} />
            {data.source === "template" && (
              <p className="mt-3 text-sm text-inkSoft">
                Suggested from what you two have done before.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
