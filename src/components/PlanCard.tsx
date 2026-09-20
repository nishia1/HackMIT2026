"use client";
import { useState } from "react";
import type { Plan } from "@/lib/types";

/**
 * One thing you could actually do: what, when, and where.
 *
 * Shows a single plan at a time. The refresh button in the top right cycles
 * to the next plan (and wraps back to the first after the last). "Place it"
 * commits the plan and hands it to onPick.
 */

export type PlanCardProps = {
  name: string;
  plans: Plan[];
  stamps?: { eventId: string; title: string; emoji: string }[];
  source?: "ai" | "template";
  onPick?: (plan: Plan) => void;
};

const icon = {
  viewBox: "0 0 24 24",
  width: 16,
  height: 16,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/**
 * Turns a loose "Thursday evening" into "Thursday, Sep 24 · Evening" by
 * finding the next occurrence of that weekday. Anything we can't read
 * (already a date, "this weekend", ...) is returned untouched.
 *
 * Better long-term: have /api/plan return an ISO datetime and format that.
 */
function formatWhen(when: string, now: Date = new Date()): string {
  const lower = when.toLowerCase();

  let offset: number | null = null;
  let word = "";

  if (/\btoday\b/.test(lower)) {
    offset = 0;
    word = "today";
  } else if (/\btomorrow\b/.test(lower)) {
    offset = 1;
    word = "tomorrow";
  } else {
    const di = DAYS.findIndex((d) => new RegExp(`\\b${d}\\b`).test(lower));
    if (di >= 0) {
      offset = (di - now.getDay() + 7) % 7;
      word = DAYS[di];
    }
  }

  if (offset === null) return when;

  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const rest = when
    .replace(new RegExp(`\\b${word}\\b`, "i"), "")
    .replace(/\b(this|next|on)\b/gi, "")
    .replace(/^[\s,·\-–]+|[\s,·\-–]+$/g, "")
    .replace(/\s+/g, " ");

  return rest ? `${dateStr} · ${rest.charAt(0).toUpperCase()}${rest.slice(1)}` : dateStr;
}

export default function PlanCard({ name, plans, onPick }: PlanCardProps) {
  const [index, setIndex] = useState(0);
  const [placed, setPlaced] = useState(false);

  if (plans.length === 0) {
    return (
      <p className="rounded-xl border border-ink/20 bg-paper p-5 text-inkSoft">
        Nothing to suggest for {name} yet — add an event you did together first.
      </p>
    );
  }

  const plan = plans[index % plans.length];

  const showNext = () => {
    setIndex((i) => (i + 1) % plans.length);
    setPlaced(false);
  };

  const place = () => {
    setPlaced(true);
    onPick?.(plan);
  };

  return (
    <section className="relative overflow-hidden rounded-xl border border-ink/20 bg-paper">
      {/* aria-live so screen readers hear the new idea after a refresh */}
      <div aria-live="polite" className={`px-5 pt-4 ${plans.length > 1 ? "pr-16" : ""}`}>
        <p className="font-display text-lg leading-snug">{plan.what}</p>

        <p className="mt-2 flex items-center gap-2 text-inkSoft">
          <svg {...icon}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <span>{formatWhen(plan.when)}</span>
        </p>

        {plan.where && (
          <p className="mt-1 flex items-center gap-2 text-inkSoft">
            <svg {...icon}>
              <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{plan.where}</span>
          </p>
        )}
      </div>

      {plans.length > 1 && (
        <button
          type="button"
          onClick={showNext}
          aria-label="Show another idea"
          title="Show another idea"
          className="absolute right-3 top-3 rounded-full border border-ink/25 bg-paper p-2 text-ink hover:bg-ink/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <svg {...icon}>
            <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
        </button>
      )}

      <div className="px-5 pb-4 pt-4">
        <button
          type="button"
          onClick={place}
          disabled={placed}
          className={`rounded-md px-4 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
            placed ? "border border-ink/25 bg-paper text-inkSoft" : "bg-ink text-paper"
          }`}
        >
          {placed ? `Placed on calendar` : "Place it"}
        </button>
      </div>
    </section>
  );
}