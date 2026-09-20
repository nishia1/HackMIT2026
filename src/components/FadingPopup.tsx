"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import PillButton from "@/components/PillButton";
import type { Nudge } from "@/lib/types";

/**
 * "You're losing this one."
 *
 * The same thing NudgeCard said, but caught on the way past instead of
 * waiting in a list: scrolling the circle's Individual tab onto a fading
 * connection stops you on it. The one screen in the app that asks something
 * of you, so it is modal — you answer it and carry on, rather than scrolling
 * past a card you were always going to ignore.
 *
 * Shown once per person per visit (see InfiniteMainString): coming round the
 * ribbon again should not mean being told the same thing again.
 */
export default function FadingPopup({
  nudge,
  onDismiss,
}: {
  nudge: Nudge;
  onDismiss: () => void;
}) {
  const router = useRouter();

  // Hold the page still underneath. Scrolling on is what the popup is
  // interrupting, so letting it happen behind would make it a decoration.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Escape dismisses, like any dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fading-popup-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
    >
      {/* Tapping the backdrop dismisses, the same as Not now. */}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="absolute inset-0 cursor-default bg-[rgba(30,0,10,0.55)]"
      />

      <div
        className="relative w-full max-w-[340px] rounded-[18px] border-2 border-[#6d0000] bg-paper p-6 text-center shadow-xl"
        style={{
          backgroundImage: "url(/circle/grid-tile-seamless.png)",
          backgroundSize: "100% auto",
        }}
      >
        <p className="font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-[#6d0000]">
          You&rsquo;re losing this one
        </p>

        <h2 id="fading-popup-title" className="mt-3 font-display text-[28px] leading-tight text-[#3a0010]">
          {nudge.name} is fading
        </h2>

        <p className="mt-2 text-[15px] text-[#6d0000]">{nudge.line}</p>

        {nudge.lastStamp && (
          <p className="mt-4 border-t border-[#6d0000]/25 pt-4 text-[15px] text-[#3a0010]">
            <span className="mr-2 text-xl">{nudge.lastStamp.emoji}</span>
            {nudge.lastStamp.caption ?? nudge.lastStamp.title}
          </p>
        )}

        <div className="mt-6 flex flex-col items-center gap-3">
          <PillButton onClick={() => router.push(`/plan/${nudge.personId}`)}>
            MAKE A PLAN
          </PillButton>
          <button
            type="button"
            onClick={onDismiss}
            className="font-mono text-[13px] font-bold uppercase tracking-wider text-[#6d0000] underline"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
