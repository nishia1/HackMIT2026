"use client";
import Link from "next/link";
import type { Nudge } from "@/lib/types";

/**
 * "Maya's fading." The one screen in the app that asks something of you.
 *
 * The line is a template today; Dev 1's `nudgeCopy()` replaces it at hour 8
 * and this component doesn't change, because it only ever renders `line`.
 */
export default function NudgeCard({ nudge }: { nudge: Nudge }) {
  return (
    <article className="rounded-xl border border-string/50 bg-paper p-4">
      <p className="font-display text-xs uppercase tracking-widest text-inkSoft">
        You&rsquo;re losing this one
      </p>
      <h2 className="mt-2 font-display text-2xl">{nudge.name} is fading</h2>
      <p className="mt-1 text-inkSoft">{nudge.line}</p>

      {nudge.lastStamp && (
        <p className="mt-3 border-t border-ink/10 pt-3">
          <span className="mr-2 text-xl">{nudge.lastStamp.emoji}</span>
          {nudge.lastStamp.caption ?? nudge.lastStamp.title}
        </p>
      )}

      <Link
        href={`/card/${nudge.personId}`}
        className="mt-4 inline-block rounded-md bg-string px-4 py-2 text-paper"
      >
        Make a plan
      </Link>
    </article>
  );
}
