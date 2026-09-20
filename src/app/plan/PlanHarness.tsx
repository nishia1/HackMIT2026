"use client";
import { useState } from "react";
import PlanCard from "@/components/PlanCard";
import type { Plan } from "@/lib/types";

/**
 * Harness for /api/plan. Shows just the "Ways to see {name}" card.
 *
 * Delete once Dev 3's NudgeCard has its "Make a plan" button wired to
 * /api/plan.
 */

type Response = {
  name: string;
  plans: Plan[];
  source: "ai" | "template";
  stamps: { eventId: string; title: string; emoji: string }[];
};

const PEOPLE = [
  { id: "maya", label: "Maya · same city, 5 months cold" },
  { id: "jordan", label: "Jordan · different city" },
];

export default function PlanHarness() {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theirEmail, setTheirEmail] = useState("");

  const run = async (personId: string) => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ personId, theirEmail: theirEmail.trim() || undefined }),
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
    <div className="space-y-8 pt-8">
      <header>
        <h1 className="font-display text-3xl">Planner</h1>
        <p className="mt-2 text-inkSoft">Harness for /api/plan. Not a real screen.</p>
      </header>

      <div className="space-y-2">
        <label className="block text-sm text-inkSoft" htmlFor="their-email">
          Their email (real Google account, to test mutual calendar availability)
        </label>
        <input
          id="their-email"
          type="email"
          value={theirEmail}
          onChange={(e) => setTheirEmail(e.target.value)}
          placeholder="signed in as a second Google account"
          className="w-full rounded-md border border-ink/25 bg-paper px-3 py-2"
        />
      </div>

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
        <PlanCard
          name={data.name}
          plans={data.plans}
          stamps={data.stamps}
          source={data.source}
        />
      )}
    </div>
  );
}