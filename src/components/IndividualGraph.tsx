/**
 * The two-person counterpart to GroupGraph (Figma node 26:3081, "2 ppl"): one
 * connection instead of a whole group's web, so it's laid out by hand from
 * the design's own line and filler-box coordinates rather than derived from
 * GroupGraph's N-person ellipse layout, which only ever produces exactly one
 * edge for two people and none of this design's fan of extra threads.
 *
 * The design's frame, in its own px. Endpoints and rects below are authored
 * in these coordinates and emitted as percentages, so the graph scales with
 * its container while keeping the Figma proportions exactly.
 */
const FRAME_W = 402;
const FRAME_H = 874;
/** Paper below the graph, so the page scrolls past the bottom of the pair instead of ending exactly on the last character. */
const FRAME_TAIL = 150;
const TOTAL_H = FRAME_H + FRAME_TAIL;
/**
 * The exported card's own tail: paper below the pair, so the card runs on
 * past the bottom rather than ending on the last character. Shorter than the
 * page's, since the card is a fixed shape, not something you scroll — same
 * idea as GroupGraph's HIGHLIGHTS_TAIL.
 */
const HIGHLIGHTS_TAIL = 110;
/** The exported card's proportions, for whatever frames it (see IndividualHighlightsCard). */
export const HIGHLIGHTS_ASPECT = FRAME_W / (FRAME_H + HIGHLIGHTS_TAIL);
/** How much the pair shrinks within the frame on the exported card, so the card's own paper still shows around them — same idea as GroupGraph's HIGHLIGHTS_WEB_SCALE. */
const HIGHLIGHTS_SCALE = 0.86;
/** How far down the card the pair sits, to leave the heading its own band of paper. */
const HIGHLIGHTS_DROP = 54;

/** Character art — the same asset and crop as GroupGraph's people. */
const CHAR_H = 112;
const CHAR_ASPECT = 431 / 272;
const CHAR_SRC = "/circle/group-character.png";
/** Centers of the two characters, in frame coordinates (from the design's "Mask group" nodes). */
const TOP_CHAR = { x: 203.5, y: 200.5 };
const BOTTOM_CHAR = { x: 216.5, y: 639.5 };
/** Clearance between the bottom character's feet and the footer (the export button), so it sits just under the pair instead of down in the scroll tail. */
const FOOTER_GAP = 50;
/** Midpoint between the two characters — what the highlights scale/drop is measured from. */
const SCALE_CENTER_Y = (TOP_CHAR.y + BOTTOM_CHAR.y) / 2;

/** The one thick "main bond" line straight down the middle, between the two characters. */
const THICK_LINE: [number, number, number, number] = [208, 219, 215, 627];

/** Filler boxes: shared-photo slots, one per thread, positioned as in the design. */
const FILLER_BOXES: { x: number; y: number; w: number; h: number; dashed?: boolean }[] = [
  { x: 20, y: 464, w: 87, h: 75 },
  { x: 6, y: 226, w: 84, h: 73 },
  { x: 43, y: 321, w: 87, h: 75 },
  { x: 305, y: 273, w: 86, h: 64 },
  { x: 324, y: 396, w: 67, h: 64 },
  { x: 262, y: 508, w: 81, h: 64, dashed: true },
  { x: 160, y: 305, w: 71, h: 51 },
];

function pct(value: number, extent: number): string {
  return `${(value / extent) * 100}%`;
}

export default function IndividualGraph({
  otherName,
  yourName = "YOU",
  footer,
  variant = "page",
}: {
  /** The person this connection is with — shown at the top of the pair. */
  otherName: string;
  /** The signed-in user — shown at the bottom, matching GroupGraph's "you". */
  yourName?: string;
  /** Rendered on the paper just below the pair, inside the frame. */
  footer?: React.ReactNode;
  /**
   * "page" is the connection's own screen: both names, the full "X & Y"
   * heading, and paper below to scroll onto. "highlights" is the same graph
   * as the exported card — a fixed heading, no names, and no tail, since the
   * card is a fixed shape. Mirrors GroupGraph's variant.
   */
  variant?: "page" | "highlights";
}) {
  const highlights = variant === "highlights";
  const totalH = highlights ? FRAME_H + HIGHLIGHTS_TAIL : TOTAL_H;
  const scale = highlights ? HIGHLIGHTS_SCALE : 1;
  const drop = highlights ? HIGHLIGHTS_DROP : 0;

  /** Scales a frame point toward the pair's own center, then drops it — the highlights card's shrink-and-settle, a no-op on the page variant. */
  const sp = (x: number, y: number) => ({
    x: FRAME_W / 2 + (x - FRAME_W / 2) * scale,
    y: SCALE_CENTER_Y + (y - SCALE_CENTER_Y) * scale + drop,
  });

  const topChar = sp(TOP_CHAR.x, TOP_CHAR.y);
  const bottomChar = sp(BOTTOM_CHAR.x, BOTTOM_CHAR.y);
  const thickStart = sp(THICK_LINE[0], THICK_LINE[1]);
  const thickEnd = sp(THICK_LINE[2], THICK_LINE[3]);
  const fillerBoxes = FILLER_BOXES.map((box) => {
    const center = sp(box.x + box.w / 2, box.y + box.h / 2);
    const w = box.w * scale;
    const h = box.h * scale;
    return { ...box, x: center.x - w / 2, y: center.y - h / 2, w, h };
  });
  const charH = CHAR_H * scale;
  const charW = charH / CHAR_ASPECT;

  return (
    <div
      className="relative mx-auto w-full max-w-[520px] overflow-hidden"
      style={{ aspectRatio: `${FRAME_W} / ${totalH}` }}
    >
      {/* eslint-disable @next/next/no-img-element */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "url(/circle/grid-tile-seamless.png)",
          backgroundSize: "100% auto",
          backgroundRepeat: "repeat-y",
        }}
      />
      {!highlights && (
        <>
          <img
            src="/circle/group-watercolor-1.png"
            alt=""
            aria-hidden
            className="pointer-events-none absolute max-w-none object-cover opacity-80"
            style={{ left: pct(58, FRAME_W), top: pct(201, totalH), width: pct(333, FRAME_W), height: pct(479, totalH) }}
          />
          <img
            src="/circle/group-watercolor-2.png"
            alt=""
            aria-hidden
            className="pointer-events-none absolute max-w-none object-cover opacity-20"
            style={{ left: pct(99, FRAME_W), top: pct(263, totalH), width: pct(244, FRAME_W), height: pct(352, totalH) }}
          />
        </>
      )}

      <svg aria-hidden viewBox={`0 0 ${FRAME_W} ${totalH}`} className="pointer-events-none absolute inset-0 h-full w-full">
        {/* Each filler box gets exactly two threads: one to the person at top, one to the person at bottom — the two ends of the memory it belongs to. */}
        {fillerBoxes.map((box, i) => {
          const cx = box.x + box.w / 2;
          const cy = box.y + box.h / 2;
          return (
            <g key={i}>
              <line x1={topChar.x} y1={topChar.y} x2={cx} y2={cy} stroke="#FF0404" strokeWidth={2} />
              <line x1={bottomChar.x} y1={bottomChar.y} x2={cx} y2={cy} stroke="#FF0404" strokeWidth={2} />
            </g>
          );
        })}
        <line
          x1={thickStart.x}
          y1={thickStart.y}
          x2={thickEnd.x}
          y2={thickEnd.y}
          stroke="#FF0404"
          strokeWidth={7 * scale}
          strokeLinecap="round"
        />
      </svg>

      {fillerBoxes.map((box, i) => (
        <div
          key={i}
          className={
            box.dashed
              ? "absolute rounded-[9px] border border-dashed border-[#6d0000] bg-[rgba(255,185,185,0.38)]"
              : "absolute rounded-[9px] bg-[#d9d9d9]"
          }
          style={{
            left: pct(box.x, FRAME_W),
            top: pct(box.y, totalH),
            width: pct(box.w, FRAME_W),
            height: pct(box.h, totalH),
          }}
        />
      ))}

      <img
        src={CHAR_SRC}
        alt=""
        aria-hidden
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 max-w-none object-contain"
        style={{
          left: pct(topChar.x, FRAME_W),
          top: pct(topChar.y, totalH),
          width: pct(charW, FRAME_W),
          height: pct(charH, totalH),
        }}
      />
      <img
        src={CHAR_SRC}
        alt=""
        aria-hidden
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 max-w-none object-contain"
        style={{
          left: pct(bottomChar.x, FRAME_W),
          top: pct(bottomChar.y, totalH),
          width: pct(charW, FRAME_W),
          height: pct(charH, totalH),
        }}
      />

      {!highlights && (
        <>
          {/* The paper-colored halo keeps the name legible where it happens to cross one of the grid background's solid red squares. */}
          <p
            className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-center font-mono text-[16px] leading-[1.2] text-[#c40505]"
            style={{
              left: pct(topChar.x, FRAME_W),
              top: pct(topChar.y - 78, totalH),
              textShadow: "0 0 6px var(--paper), 0 0 6px var(--paper), 0 0 6px var(--paper)",
            }}
          >
            {otherName}
          </p>
          <p
            className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-center font-mono text-[16px] leading-[1.2] text-[#c40505]"
            style={{
              left: pct(bottomChar.x, FRAME_W),
              top: pct(bottomChar.y + 78, totalH),
              textShadow: "0 0 6px var(--paper), 0 0 6px var(--paper), 0 0 6px var(--paper)",
            }}
          >
            {yourName}
          </p>
        </>
      )}

      {highlights ? (
        <h1
          className="absolute left-1/2 w-full -translate-x-1/2 whitespace-nowrap text-center font-mono text-[18px] font-bold leading-none text-[#c40505]"
          style={{ top: pct(66, totalH) }}
        >
          THIS WEEK&rsquo;S HIGHLIGHTS
        </h1>
      ) : (
        <h1
          className="absolute left-1/2 w-full -translate-x-1/2 text-center font-mono text-[32px] leading-none text-[#c40505]"
          style={{ top: pct(56, totalH) }}
        >
          {otherName} &amp; {yourName}
        </h1>
      )}

      {footer && (
        <div
          className="absolute left-1/2 flex w-full -translate-x-1/2 justify-center px-4"
          style={{ top: pct(bottomChar.y + charH / 2 + FOOTER_GAP, totalH) }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
