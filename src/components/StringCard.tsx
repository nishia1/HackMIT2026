"use client";
import Link from "next/link";
import Thread from "./Thread";
import { TIER_LABEL, colorFor } from "@/server/domain/tiers";
import type { StringView } from "@/lib/types";

/**
 * One string, stated plainly. No score out of ten — the thread across the top
 * already says everything the number would, and says it faster.
 */
export default function StringCard({
  string,
  href,
  now,
}: {
  string: StringView;
  href?: string;
  now?: string;
}) {
  const body = (
    <article className="overflow-hidden rounded-xl border border-ink/20 bg-paper">
      <div className="relative h-20 border-b border-ink/15 bg-paperDeep/60">
        <svg viewBox="0 0 320 80" className="h-full w-full" aria-hidden>
          <Thread
            x1={10}
            y1={52}
            x2={310}
            y2={28}
            depth={string.depth}
            warmth={string.warmth}
            animate
          />
        </svg>
        <span
          className="absolute bottom-2 right-3 font-display text-sm"
          style={{ color: colorFor(string.warmth) }}
        >
          {TIER_LABEL[string.tier]}
        </span>
      </div>

      <div className="p-4">
        <h2 className="font-display text-xl">{string.name}</h2>
        <p className="mt-1 text-inkSoft">
          {string.eventCount} {string.eventCount === 1 ? "thing" : "things"} together
          {string.lastSeenAt ? ` · last ${sinceLabel(string.lastSeenAt, now)}` : ""}
        </p>
      </div>
    </article>
  );

  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

function sinceLabel(lastSeenAt: string, now?: string) {
  const days = Math.max(
    0,
    Math.round(
      ((now ? new Date(now) : new Date()).getTime() - new Date(lastSeenAt).getTime()) /
        86_400_000,
    ),
  );
  if (days < 1) return "today";
  if (days < 14) return `${days} days ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} months ago`;
  return `${Math.floor(months / 12)}y ago`;
}
