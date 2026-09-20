"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { type ViewMode } from "@/components/GroupIndividualToggle";
import { DEFAULT_GROUP_CHAT_NAME, getGroupChatName } from "@/lib/groupChatNames";
import type { Loop } from "@/lib/types";
import MainStringSegment, { type MainStringSegmentHandle } from "./MainStringSegment";
import {
  FLIPPED_LABELS,
  MAIN_STRING_HEIGHT,
  MAIN_STRING_WIDTH,
  NORMAL_LABELS,
  STRING_COLORS,
  getRevealModel,
} from "./mainStringPath";

const INITIAL_SEGMENTS = 6;
const SEGMENTS_PER_LOAD = 4;
/** Where the "still growing" cutoff sits, as a fraction of viewport height. */
const REVEAL_LINE_FRACTION = 0.65;
/**
 * How quickly the on-screen reveal catches up to the scroll-driven target
 * each frame (a simple exponential ease, 0-1 of the remaining gap per
 * frame). Without this, `setReveal` jumped straight to the target every
 * frame, so any big jump in target — most visibly the very first frame on
 * load, where the reveal line already sits partway down the first tile —
 * snapped the whole first loop fully drawn instead of animating it in.
 */
const REVEAL_EASE = 0.045;
/**
 * Hard cap, as a fraction of MAIN_STRING_HEIGHT, on how much the eased
 * progress can advance in a single frame. REVEAL_EASE alone scales the
 * per-frame step with the size of the remaining gap, so a *big* jump in
 * target — the initial catch-up on load (which starts with the reveal line
 * already partway down the first tile), or a fast/flicked scroll — takes
 * proportionally large steps too. If one of those steps is bigger than a
 * loop's y-span, the loop's reveal (and the character walking it) jumps
 * straight past it in a frame or two instead of visibly unspooling around
 * it. Small, incremental scroll deltas (the common case once you're already
 * scrolling normally) never approach this cap, so it only changes behavior
 * for big jumps.
 */
const REVEAL_MAX_STEP = 6 / MAIN_STRING_HEIGHT;

/** The two walking-animation frames, alternated as the character travels along the path. */
const CHAR_FRAME_SRCS = ["/circle/char-walk-2-1.png", "/circle/char-walk-2.png"] as const;
/** How far (in on-screen px) the character travels before switching walk frames — a stride length, not a timer, so the animation pauses when scrolling stops. */
const CHAR_STEP_PX = 36;
/** Character width, as a fraction of the tile's on-screen width. */
const CHAR_WIDTH_FRACTION = 0.11;
/** Minimum per-frame horizontal movement (px) before the character's facing direction updates. */
const CHAR_FACING_DEADZONE_PX = 0.5;

/** Displayed top/bottom colour for segment `i`, continuous across the whole scroll. */
function displayedColors(i: number) {
  const n = STRING_COLORS.length;
  return {
    top: STRING_COLORS[i % n],
    bottom: STRING_COLORS[(i + 1) % n],
  };
}

export default function InfiniteMainString({
  mode,
  loops,
}: {
  mode: ViewMode;
  loops: Loop[];
}) {
  const [segmentCount, setSegmentCount] = useState(INITIAL_SEGMENTS);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const tileRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const segmentHandles = useRef<Map<number, MainStringSegmentHandle>>(new Map());
  const revealProgress = useRef<Map<number, number>>(new Map());
  const charElRef = useRef<HTMLDivElement | null>(null);
  const charImgRef = useRef<HTMLImageElement | null>(null);
  const charDistance = useRef(0);
  const charPrevPoint = useRef<{ x: number; y: number } | null>(null);
  const charFacing = useRef<1 | -1>(1);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSegmentCount((c) => c + SEGMENTS_PER_LOAD);
        }
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Reveals each segment's ribbon top-down as it scrolls up into view, so it
  // looks like it's growing rather than being pre-drawn. The "reveal line"
  // sits partway down the viewport (not at its bottom edge — content past
  // the bottom edge isn't visible anyway, so a boundary drawn there is
  // invisible) so you can actually watch the growth climb the screen as you
  // scroll. Driven by rAF (not a scroll listener) so it also settles
  // correctly after resizes, image loads, or new segments shifting layout.
  //
  // The same pass also walks the character along the ribbon's leading edge:
  // whichever tile is furthest into its reveal is the "frontier" tile, and
  // the character sits at that tile's down-edge point for the current
  // (eased) progress — the exact point the ribbon's own down-edge mask
  // stroke is drawn to (see MainStringSegment), including its loop-spread
  // pacing, so the character actually traces each loop's curve as it's
  // revealed instead of snapping straight to the loop's far edge. It also
  // flips to face the direction it's currently moving horizontally.
  useEffect(() => {
    let raf = 0;
    const animate = () => {
      const revealLine = window.innerHeight * REVEAL_LINE_FRACTION;
      let frontierIndex = -1;
      tileRefs.current.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        const target = rect.height > 0 ? clamp((revealLine - rect.top) / rect.height, 0, 1) : 0;
        const current = revealProgress.current.get(index) ?? 0;
        const rawStep = (target - current) * REVEAL_EASE;
        const step = clamp(rawStep, -REVEAL_MAX_STEP, REVEAL_MAX_STEP);
        const eased = current + step;
        revealProgress.current.set(index, eased);
        segmentHandles.current.get(index)?.setReveal(eased);
        if (target > 0) frontierIndex = index;
      });
      updateCharacter(frontierIndex);
      raf = requestAnimationFrame(animate);
    };

    const updateCharacter = (frontierIndex: number) => {
      const container = containerRef.current;
      const charEl = charElRef.current;
      const imgEl = charImgRef.current;
      const tileEl = frontierIndex >= 0 ? tileRefs.current.get(frontierIndex) : undefined;
      if (!container || !charEl || !imgEl || !tileEl) {
        if (charEl) charEl.style.opacity = "0";
        return;
      }

      const flipped = frontierIndex % 2 === 1;
      const eased = revealProgress.current.get(frontierIndex) ?? 0;
      const downEdge = getRevealModel(flipped).downEdge;
      const point = downEdge.pointAtLength(downEdge.lengthForY(eased * MAIN_STRING_HEIGHT));

      const tileRect = tileEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const left = tileRect.left - containerRect.left + (point.x / MAIN_STRING_WIDTH) * tileRect.width;
      const top = tileRect.top - containerRect.top + (point.y / MAIN_STRING_HEIGHT) * tileRect.height;

      const prev = charPrevPoint.current;
      if (prev) {
        const dx = left - prev.x;
        charDistance.current += Math.hypot(dx, top - prev.y);
        // Ignore near-vertical movement (loop tops/bottoms) so the character
        // doesn't flicker facing when it's briefly moving almost straight up
        // or down rather than clearly left or right.
        if (Math.abs(dx) > CHAR_FACING_DEADZONE_PX) {
          const facing = dx < 0 ? -1 : 1;
          if (facing !== charFacing.current) {
            charFacing.current = facing;
            imgEl.style.transform = `scaleX(${facing})`;
          }
        }
      }
      charPrevPoint.current = { x: left, y: top };

      const frame = Math.floor(charDistance.current / CHAR_STEP_PX) % CHAR_FRAME_SRCS.length;
      const src = CHAR_FRAME_SRCS[frame];
      if (imgEl.getAttribute("src") !== src) imgEl.setAttribute("src", src);

      charEl.style.width = `${tileRect.width * CHAR_WIDTH_FRACTION}px`;
      charEl.style.transform = `translate(${left}px, ${top}px)`;
      charEl.style.opacity = "1";
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={containerRef} className="relative -mx-5 w-[calc(100%+2.5rem)] max-w-none overflow-hidden bg-paper">
      <GridBackground segmentCount={segmentCount} />
      <div className="relative z-10">
        {Array.from({ length: segmentCount }, (_, i) => (
          <StringTile
            key={i}
            index={i}
            mode={mode}
            loops={loops}
            tileRef={(el) => {
              if (el) tileRefs.current.set(i, el);
              else tileRefs.current.delete(i);
            }}
            segmentRef={(handle) => {
              if (handle) segmentHandles.current.set(i, handle);
              else segmentHandles.current.delete(i);
            }}
          />
        ))}
        <div ref={sentinelRef} aria-hidden className="h-1 w-full" />
      </div>
      {/* Positioned imperatively every rAF tick (see the effect above), not via React state — this needs to move every frame while scrolling, which a re-render per frame can't keep up with. */}
      <div ref={charElRef} aria-hidden className="pointer-events-none absolute left-0 top-0 z-20 opacity-0">
        {/* Anchors the character's feet to the tracked point; kept separate from the img's own flip transform below (translate% is resolved against the img's untransformed box either way, but this keeps the two transforms independently updatable). */}
        <div style={{ transform: "translate(-50%, -85%)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={charImgRef} src={CHAR_FRAME_SRCS[0]} alt="" className="w-full object-contain" />
        </div>
      </div>
    </div>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

const GRID_TILE_WIDTH = 511;
const GRID_TILE_HEIGHT = 908;

/**
 * The "Grid_background" layer from Figma (node 26:3008 / 26:3057), tiled
 * seamlessly down the whole scroll length behind the string and its
 * background art. Cropped to Figma's exact 511:908 frame aspect (matching
 * its object-cover sizing there) so the grid squares repeat at the right
 * scale instead of the raw asset's native aspect ratio.
 *
 * Stacked as real <img> tiles laid out in normal flow (rather than a CSS
 * `background-size` repeat) so adjacent tiles abut exactly — a percentage
 * background-size repeat accumulates sub-pixel rounding error over a tall
 * scroll area and opens a visible seam every few tiles.
 */
function GridBackground({ segmentCount }: { segmentCount: number }) {
  // Each string segment is taller than one grid tile, so over-provision
  // tiles generously; the parent clips anything that overshoots.
  const tileCount = Math.ceil((segmentCount * MAIN_STRING_HEIGHT) / GRID_TILE_HEIGHT) + 2;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {Array.from({ length: tileCount }, (_, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src="/circle/grid-tile.png"
          alt=""
          className="block w-full"
          style={{ aspectRatio: `${GRID_TILE_WIDTH} / ${GRID_TILE_HEIGHT}` }}
        />
      ))}
    </div>
  );
}

function StringTile({
  index,
  mode,
  loops,
  tileRef,
  segmentRef,
}: {
  index: number;
  mode: ViewMode;
  loops: Loop[];
  tileRef: (el: HTMLDivElement | null) => void;
  segmentRef: (handle: MainStringSegmentHandle | null) => void;
}) {
  const flipped = index % 2 === 1;
  const { top, bottom } = displayedColors(index);
  const labels = flipped ? FLIPPED_LABELS : NORMAL_LABELS;

  return (
    <div
      ref={tileRef}
      className="relative w-full"
      style={{ aspectRatio: `${MAIN_STRING_WIDTH} / ${MAIN_STRING_HEIGHT}` }}
      data-string-tile={index}
    >
      {index === 0 && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/circle/bg-art-1.png"
          alt=""
          className="pointer-events-none absolute left-[-5%] top-0 w-[105%] max-w-none object-cover opacity-90"
          style={{ height: "93%" }}
        />
      )}

      <MainStringSegment
        ref={segmentRef}
        gradientId={`main-string-gradient-${index}`}
        topColor={top}
        bottomColor={bottom}
        flipped={flipped}
      />

      {labels.map((label, i) => {
        const groupChatId = `main-${index}-${i}`;
        /**
         * The ribbon draws far more loops than you have connections, so the
         * list cycles. Keyed off the loop's position in the whole scroll, not
         * within this tile, so the sequence runs on across tiles instead of
         * restarting at every one.
         */
        const person = loops.length > 0 ? loops[(index * labels.length + i) % loops.length] : null;

        const placement = {
          left: `${label.left}%`,
          top: `${label.top}%`,
          width: `${label.width}%`,
          transform: "translate(-50%, -50%)",
        };
        const className =
          "absolute break-words text-center font-mono font-bold text-[16px] leading-[1.2] text-[#c40505]";

        // A new account has no connections. The ribbon still draws — there is
        // just nothing to name, and nowhere for the label to go.
        if (mode === "individual" && !person) {
          return (
            <span key={i} className={`${className} opacity-40`} style={placement}>
              &mdash;
            </span>
          );
        }

        return (
          <Link
            key={i}
            href={mode === "individual" ? `/individual/${person!.personId}` : `/group-chat/${groupChatId}`}
            className={`${className} hover:underline`}
            style={placement}
          >
            {mode === "individual" ? (
              person!.name
            ) : (
              <GroupChatLabelText id={groupChatId} />
            )}
          </Link>
        );
      })}
    </div>
  );
}

/**
 * A group chat's current name, defaulting to "NEW GROUP CHAT" until the user
 * renames it on the chat page (see groupChatNames.ts). Starts at the default
 * on the server/first client render and swaps to the stored name after mount
 * — localStorage isn't available during SSR, and reading it before mount
 * would mismatch the server-rendered markup.
 *
 * Individual labels need none of this: they are real people, named by the
 * server, so they render straight from their loop.
 */
function GroupChatLabelText({ id }: { id: string }) {
  const [name, setName] = useState(DEFAULT_GROUP_CHAT_NAME);
  useEffect(() => {
    setName(getGroupChatName(id));
  }, [id]);
  return <>{name}</>;
}

