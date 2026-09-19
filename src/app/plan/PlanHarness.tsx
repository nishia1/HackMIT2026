"use client";
import { useState } from "react";
import PlanCard from "@/components/PlanCard";
import type { Plan } from "@/lib/types";

/**
 * A harness, not a screen. Delete it once Dev 3's NudgeCard has its "Make a
 * plan" button wired to /api/plan — that's the real entry point.
 *
 * It exists so this slice is demoable on its own at the hour-3 checkpoint
 * instead of waiting on someone else's card.
 */

type Response = {
  name: string;
  plans: Plan[];
  source: "ai" | "template";
  stamps: { eventId: string; title: string; emoji: string }[];
  constraints: { budget: string; virtual: boolean; evenings: string[]; kinds: string[] };
};

const PEOPLE = [
  { id: "maya", label: "Maya · same city, 5 months cold" },
  { id: "jordan", label: "Jordan · different city" },
];

export default function PlanHarness() {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (personId: string) => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ personId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "request failed");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pt-8">
      <header>
        <h1 className="font-display text-3xl">Planner</h1>
        <p className="mt-2 text-inkSoft">Harness for /api/plan. Not a real screen.</p>
      </header>

      <div className="flex flex-col gap-2">
        {PEOPLE.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => run(p.id)}
            disabled={loading}
            className="rounded-md border border-ink/25 bg-paper px-4 py-3 text-left disabled:opacity-60"
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-inkSoft">Thinking&hellip;</p>}
      {error && <p className="text-string">{error}</p>}

      {data && (
        <>
          <PlanCard
            name={data.name}
            plans={data.plans}
            stamps={data.stamps}
            source={data.source}
          />
          <dl className="rounded-lg border border-ink/15 p-4 text-sm text-inkSoft">
            <div className="flex justify-between">
              <dt>source</dt>
              <dd>{data.source}</dd>
            </div>
            <div className="flex justify-between">
              <dt>budget ceiling</dt>
              <dd>{data.constraints.budget}</dd>
            </div>
            <div className="flex justify-between">
              <dt>virtual</dt>
              <dd>{String(data.constraints.virtual)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>shared evenings</dt>
              <dd>{data.constraints.evenings.join(", ") || "none"}</dd>
            </div>
            <div className="flex justify-between">
              <dt>usual kinds</dt>
              <dd>{data.constraints.kinds.join(", ") || "none"}</dd>
            </div>
          </dl>
        </>
      )}
    </div>
  );
}
