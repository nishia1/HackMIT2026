"use client";
import { useState } from "react";
import type { Plan } from "@/lib/types";

/**
 * Three things you could actually do, and the memory each one came from.
 *
 * The "because" line is the whole point. A suggestion with no reason is a
 * notification; a suggestion that says "because of the ramen place in March"
 * is a nudge from someone who was paying attention. So the citation renders
 * every time, and when the model couldn't ground one we say so plainly rather
 * than dressing a template up as insight.
 */

export type PlanCardProps = {
  name: string;
  plans: Plan[];
  stamps?: { eventId: string; title: string; emoji: string }[];
  source?: "ai" | "template";
  onPick?: (plan: Plan) => void;
};

export default function PlanCard({ name, plans, stamps = [], source, onPick }: PlanCardProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const byId = new Map(stamps.map((s) => [s.eventId, s]));

  if (plans.length === 0) {
    return (
      <p className="rounded-xl border border-ink/20 bg-paper p-5 text-inkSoft">
        Nothing to suggest for {name} yet — add an event you did together first.
      </p>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-ink/20 bg-paper">
      <header className="border-b border-ink/15 bg-paperDeep/60 px-5 py-3">
        <h2 className="font-display text-lg">Three ways to see {name}</h2>
        {source === "template" && (
          <p className="text-sm text-inkSoft">Based on what you two usually do.</p>
        )}
      </header>

      <ul>
        {plans.map((plan, i) => {
          const stamp = byId.get(plan.becauseStampId);
          const isPicked = picked === i;

          return (
            <li key={i} className="border-t border-ink/10 first:border-t-0">
              <button
                type="button"
                onClick={() => {
                  setPicked(i);
                  onPick?.(plan);
                }}
                aria-pressed={isPicked}
                className={`w-full px-5 py-4 text-left transition-colors ${
                  isPicked ? "bg-stamp/20" : "hover:bg-paperDeep/40"
                }`}
              >
                <p className="font-display text-lg leading-snug">{plan.what}</p>

                <p className="mt-1 text-inkSoft">
                  {plan.when}
                  {plan.where ? ` · ${plan.where}` : ""}
                </p>

                <p className="mt-3 flex gap-2 text-sm text-inkSoft">
                  <span aria-hidden className="mt-[2px] h-2 w-2 shrink-0 rounded-full bg-string" />
                  <span>
                    {plan.because}
                    {stamp && (
                      <span className="ml-1 whitespace-nowrap">
                        {stamp.emoji} {stamp.title}
                      </span>
                    )}
                  </span>
                </p>
              </button>
            </li>
          );
        })}
      </ul>

      {picked !== null && (
        <footer className="border-t border-ink/15 px-5 py-3 text-sm text-inkSoft">
          Send it to {name} and it becomes a stamp once you&rsquo;ve done it.
        </footer>
      )}
    </section>
  );
}
