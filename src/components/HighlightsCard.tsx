"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import GroupGraph, { HIGHLIGHTS_ASPECT } from "@/components/GroupGraph";
import SaveToCameraRollButton from "@/components/SaveToCameraRollButton";
import { getGroupChatMembers, type GroupChatMember } from "@/lib/groupChatMembers";

/** Your own node in the graph, always first — the same one the chat page uses. */
const YOU: GroupChatMember = { username: "you", name: "YOU" };

/**
 * This week's highlights, the shareable card behind the group chat's export
 * button (Figma node 30:3643). Same graph as the chat page, but cut out as a
 * rounded card of the grid paper, laid on the red cloth, with yarn crossing
 * it top and bottom. The filler boxes are the photos that will eventually
 * fill this card.
 *
 * The card's layout is authored in the design's own px (a 412-wide frame)
 * and emitted as percentages, so it scales like the graph inside it.
 */
const FRAME_W = 412;
const FRAME_H = 950;

/** The card of grid paper the graph is printed on, in frame units. */
const CARD_X = 33;
const CARD_Y = 84;
const CARD_W = 338;
/**
 * How much of the card's top edge is cut off, in frame units. The card is
 * shorter than the graph printed on it by this much, and the graph sits
 * that far above the card's top edge, so the paper reads as trimmed rather
 * than as the graph having moved down it.
 */
const CARD_CROP_TOP = 34;
const GRAPH_H = CARD_W / HIGHLIGHTS_ASPECT;
const CARD_H = GRAPH_H - CARD_CROP_TOP;
const CARD_BOTTOM = CARD_Y + CARD_CROP_TOP + CARD_H;
/** Gap between the bottom of the grid paper and the save button. */
const SAVE_BUTTON_GAP = 85;

function pct(value: number, extent: number): string {
  return `${(value / extent) * 100}%`;
}

export default function HighlightsCard({ id }: { id: string }) {
  const [members, setMembers] = useState<GroupChatMember[] | null>(null);
  const [ready, setReady] = useState(false);
  /** The passport itself — the cloth, the card and the yarn — is what gets saved. */
  const passportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMembers(getGroupChatMembers(id));
    setReady(true);
  }, [id]);

  if (!ready) return null;

  return (
    <div className="pt-6">
      <Link href={`/group-chat/${id}`} className="text-inkSoft underline">
        &larr; Back to the group
      </Link>

      {/* Full-bleed: the cloth runs to the edges of the screen, as the card sits on it. */}
      <div className="relative left-1/2 mt-4 w-screen -translate-x-1/2">
        <div
          ref={passportRef}
          className="relative mx-auto w-full max-w-[520px] overflow-hidden"
          style={{ aspectRatio: `${FRAME_W} / ${FRAME_H}` }}
        >
          {/* eslint-disable @next/next/no-img-element */}
          <img
            src="/circle/highlights-bg.jpg"
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-80"
          />
          <div aria-hidden className="absolute inset-0 bg-[rgba(103,1,121,0.2)]" />

          {/* The paper the graph is printed on, cut out of the cloth. */}
          <div
            className="absolute overflow-hidden rounded-[44px]"
            style={{
              left: pct(CARD_X, FRAME_W),
              top: pct(CARD_Y + CARD_CROP_TOP, FRAME_H),
              width: pct(CARD_W, FRAME_W),
              height: pct(CARD_H, FRAME_H),
            }}
          >
            {members && members.length > 0 ? (
              <div className="absolute inset-x-0" style={{ top: pct(-CARD_CROP_TOP, CARD_H) }}>
                <GroupGraph name="" members={[YOU, ...members]} variant="highlights" />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center bg-[#F6EFE6] px-6 text-center font-mono text-[14px] text-[#c40505]">
                This group chat hasn&rsquo;t been set up yet.
              </div>
            )}
          </div>

          {/* Yarn laid over the card, one strand at each end. */}
          <img
            src="/circle/highlights-yarn.png"
            alt=""
            aria-hidden
            className="pointer-events-none absolute max-w-none rotate-180"
            style={{ left: pct(CARD_X, FRAME_W), top: pct(150, FRAME_H), width: pct(CARD_W, FRAME_W) }}
          />
          <img
            src="/circle/highlights-yarn.png"
            alt=""
            aria-hidden
            className="pointer-events-none absolute max-w-none"
            style={{ left: pct(CARD_X, FRAME_W), top: pct(640, FRAME_H), width: pct(CARD_W, FRAME_W) }}
          />
        </div>

        {/* The tab bar floats over the bottom of the page, so the button keeps its own clearance below it. */}
        {/*
          Pulled up over the cloth to sit just under the grid paper. It stays
          outside the passport itself so it isn't part of what gets saved —
          hence the negative margin rather than being positioned inside.
          Margin percentages resolve against width, which is what the whole
          frame is measured in, so this holds at any size.
        */}
        <div
          className="relative z-10 flex justify-center px-5 pb-16"
          style={{ marginTop: pct(-(FRAME_H - CARD_BOTTOM - SAVE_BUTTON_GAP), FRAME_W) }}
        >
          <SaveToCameraRollButton target={passportRef} />
        </div>
      </div>
    </div>
  );
}
