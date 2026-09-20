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

// DEMO MODE: /api/plan only knows these people right now.
// Delete this and `apiPersonId` below once the API can resolve real IDs.
const DEMO_IDS = ["maya", "jordan"];

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
}: {
  personId: string;
  name: string;
  now?: string; // accepted so existing callers don't break; not sent in demo mode
}) {
  const [data, setData] = useState<PlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Real IDs from the route won't exist in the API's data yet,
    // so fall back to maya. Swap this out when it's actually connected.
    const apiPersonId = DEMO_IDS.includes(personId) ? personId : "maya";

    (async () => {
      try {
        const res = await fetch("/api/plan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ personId: apiPersonId }), // same body shape as the harness
        });
        // A body that isn't JSON — an empty 500, an auth redirect to HTML —
        // must not surface as a parser error, which says nothing about what
        // broke.
        const text = await res.text();
        let json: (PlanResponse & { error?: string }) | null = null;
        try {
          json = text ? JSON.parse(text) : null;
        } catch {
          json = null;
        }
        if (cancelled) return;
        if (!res.ok || !json) {
          throw new Error(
            json?.error ??
              (res.status === 401
                ? "Sign in to make a plan"
                : `Could not make a plan (${res.status})`),
          );
        }
        setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not make a plan");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [personId]);

  return (
    <div className="pt-8">
      {/* Keeps the real route's personId and name so the link still goes to the right page */}
      <Link href={`/individual/${personId}`} className="text-inkSoft underline">
        &larr; Back to {name}
      </Link>

      {/* Uses the API's name so the heading matches the (demo) plans below */}
      <h1 className="mt-4 font-display text-3xl">Ways to see your friend</h1>

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
