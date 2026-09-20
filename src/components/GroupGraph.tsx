import { type GroupChatMember } from "@/lib/groupChatMembers";

/**
 * The design's frame, in its own px. Everything below is authored in these
 * coordinates and emitted as percentages, so the whole graph scales with the
 * container while keeping the Figma proportions exactly.
 */
const FRAME_W = 412;
const FRAME_H = 800;
/**
 * Empty grid below the graph, in the same units. The people and their boxes
 * all live in the top FRAME_H; this is just paper underneath them, so the
 * page scrolls past the bottom of the group instead of ending exactly where
 * the last character stands.
 */
const FRAME_TAIL = 190;
const TOTAL_H = FRAME_H + FRAME_TAIL;
/**
 * The exported card's own tail: paper below the web, so the card runs on
 * past the bottom of the group rather than ending on the last character.
 * Shorter than the page's, since the card is a fixed shape, not something
 * you scroll.
 */
const HIGHLIGHTS_TAIL = 110;
/** The exported card's proportions, for whatever frames it (see HighlightsCard). */
export const HIGHLIGHTS_ASPECT = FRAME_W / (FRAME_H + HIGHLIGHTS_TAIL);

/** Ellipse the people are spaced around, in frame coordinates. */
const CENTER_X = FRAME_W / 2;
const CENTER_Y = 445;
const RADIUS_X = 158;
const RADIUS_Y = 235;
/**
 * Bends the ellipse squarer than a circle: the people who land between the
 * top and bottom positions are pushed toward whichever end they're nearer,
 * so the upper pair sits higher and the lower pair sits lower than an even
 * ellipse would put them. 1 would be a plain ellipse; lower is squarer. The
 * top and bottom positions don't move either way.
 */
const VERTICAL_SPREAD = 0.62;
/**
 * An extra push for the names of the people on the sides — up for anyone in
 * the upper half, down for anyone in the lower half — for when a name would
 * otherwise print across its own figure. Only the name moves; the person
 * stays on the ring. The upper push is currently zero: at five people the
 * top pair's names already clear their heads on their own.
 */
const UPPER_LABEL_LIFT = 0;
const LOWER_LABEL_DROP = 34;

/**
 * Character art. The Figma asset is a small figure inside a lot of
 * transparent padding, so the committed PNG is cropped to the figure itself
 * — otherwise every character hangs above its own point on the circle
 * instead of standing on it. CHAR_H is the height the figure actually
 * occupies in the design (about half of its 141x203 frame); the width
 * follows from the cropped art's own proportions. Shrinks a little once
 * there are enough people for the side positions to crowd.
 */
const CHAR_H = 112;
const CHAR_ASPECT = 431 / 272;
const CHAR_SRC = "/circle/group-character.png";

/**
 * Filler box: the Figma Filler-1 rect, which a shared photo will fill later.
 * There's one per pair, so the count grows quadratically with the group —
 * the boxes shrink from the design's size once there are more of them than
 * the design's eight, or a big group's boxes merge into one grey slab.
 */
const FILLER_W = 94;
const FILLER_H = 80;

/**
 * How many boxes to show at most. Not every pair gets one: the design has
 * eight boxes for five people, not the ten that every pair would need, and
 * past that many the boxes crowd the people off their own graph. The ones
 * shown are sampled evenly across the connections ordered by length (see
 * chooseFillerEdges), so they spread from the ring to the middle rather
 * than ringing the edge or piling up in the centre.
 */
const FILLER_MAX = 8;

/**
 * How much of the frame the web of people takes up on the exported card.
 * The card's paper is the graph's own grid, so the web is shrunk within the
 * frame rather than the whole graph being scaled down, which would shrink
 * the paper with it and leave the card's corners bare.
 */
const HIGHLIGHTS_WEB_SCALE = 0.86;
/** How far down the card the web sits, to leave the heading its own band of paper. */
const HIGHLIGHTS_WEB_DROP = 54;

/** How far outside the ellipse a person's name sits, so labels clear their own art. */
const LABEL_OFFSET_X = 60;
const LABEL_OFFSET_Y = 78;

/**
 * Where along its own line a filler box is allowed to sit. A box belongs to
 * its pair's line, not to a particular point on it, so sliding it along the
 * line keeps it on the right connection while getting it out of another
 * box's way (see placeFillers).
 */
const FILLER_POSITIONS = [0.5, ...Array.from({ length: 9 }, (_, i) => 0.04 * (i + 1)).flatMap((d) => [0.5 - d, 0.5 + d])];
/**
 * How far a box may also be pushed off its line, at right angles to it. The
 * bigger boxes can't always find room by sliding alone, and a box a little
 * to one side of its line still reads as belonging to it.
 */
const FILLER_SIDESTEPS = [0, -14, 14, -28, 28];

/** Clear space kept between two boxes, so they read as separate slots. */
const FILLER_GAP = 5;
/**
 * A last few percent off every box. With a crowded group the boxes can fill
 * their lines so tightly that one of them has no clear spot left and has to
 * settle for overlapping a neighbour; shaving them slightly is what lets
 * the placement come out clean.
 */
const FILLER_FIT = 0.93;

/**
 * Hand nudges for individual boxes, in frame units, keyed by the two
 * usernames of the connection sorted and joined with "--". placeFillers
 * treats every connection the same way; this is where a particular box gets
 * moved off what the placement picked, for a group whose shape needs it.
 */
const FILLER_NUDGES: Record<string, { x?: number; y?: number }> = {
  "morgandiaz--you": { x: 16 },
};

function nudgeFor(a: string, b: string): { x?: number; y?: number } {
  return FILLER_NUDGES[[a, b].sort().join("--")] ?? {};
}

/** Keeps a name from running off the edge of the frame. */
const LABEL_W = 104;
const LABEL_MARGIN = 6;

type Node = {
  member: GroupChatMember;
  /** Frame coordinates of the person's centre. */
  x: number;
  y: number;
  /** Unit vector pointing away from the middle of the circle, for label placement. */
  outX: number;
  outY: number;
  /** On the side of the ring — in the upper or lower half, but not the person at the very top or very bottom. */
  upperSide: boolean;
  lowerSide: boolean;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function pct(value: number, extent: number): string {
  return `${(value / extent) * 100}%`;
}

/**
 * People are laid out evenly around the ellipse starting at the bottom, so
 * "you" (always first) stands where the design puts character 1.
 */
function layout(members: GroupChatMember[], scale: number, drop: number): Node[] {
  return members.map((member, i) => {
    const angle = Math.PI / 2 + (i * 2 * Math.PI) / members.length;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      member,
      x: CENTER_X + RADIUS_X * scale * cos,
      y: CENTER_Y + drop + RADIUS_Y * scale * Math.sign(sin) * Math.abs(sin) ** VERTICAL_SPREAD,
      outX: cos,
      outY: sin,
      upperSide: sin < -0.01 && Math.abs(sin) < 0.99,
      lowerSide: sin > 0.01 && Math.abs(sin) < 0.99,
    };
  });
}

/**
 * Which connections get a filler box, when there are more connections than
 * FILLER_MAX. Sampled at an even stride through the connections sorted
 * short to long, so the chosen ones range from neighbours on the ring to
 * pairs straight across it.
 */
function chooseFillerEdges<T extends { a: Node; b: Node }>(edges: T[]): T[] {
  if (edges.length <= FILLER_MAX) return edges;
  const byLength = [...edges].sort(
    (p, q) =>
      Math.hypot(p.b.x - p.a.x, p.b.y - p.a.y) - Math.hypot(q.b.x - q.a.x, q.b.y - q.a.y),
  );
  const stride = byLength.length / FILLER_MAX;
  return Array.from({ length: FILLER_MAX }, (_, i) => byLength[Math.floor(i * stride)]);
}

type Rect = { x: number; y: number; w: number; h: number };

function overlapArea(a: Rect, b: Rect, gap: number): number {
  const dx = Math.min(a.x + a.w / 2 + gap, b.x + b.w / 2 + gap) - Math.max(a.x - a.w / 2 - gap, b.x - b.w / 2 - gap);
  const dy = Math.min(a.y + a.h / 2 + gap, b.y + b.h / 2 + gap) - Math.max(a.y - a.h / 2 - gap, b.y - b.h / 2 - gap);
  return dx > 0 && dy > 0 ? dx * dy : 0;
}

/**
 * Gives each pair's filler box a spot on its own line that no other box has
 * taken. Boxes are placed one at a time, each trying the positions in
 * FILLER_POSITIONS in order and taking the first that's clear of everything
 * already placed — so a box sits at its line's midpoint when it can and
 * slides along the line when it can't. Short lines are placed first,
 * because they have the least room to slide before running into a person.
 *
 * If a box can't find a clear spot anywhere on its line (a big enough group
 * runs out of room), it takes the position that overlaps least rather than
 * going missing — every connection keeps its slot.
 */
function placeFillers(
  edges: { a: Node; b: Node }[],
  w: number,
  h: number,
): { x: number; y: number }[] {
  const order = edges
    .map((edge, i) => ({ i, length: Math.hypot(edge.b.x - edge.a.x, edge.b.y - edge.a.y) }))
    .sort((p, q) => p.length - q.length);

  const placed: Rect[] = [];
  const result: { x: number; y: number }[] = new Array(edges.length);

  for (const { i } of order) {
    const { a, b } = edges[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    // Unit vector at right angles to the line, for the sidesteps.
    const perpX = -(b.y - a.y) / len;
    const perpY = (b.x - a.x) / len;

    // Every spot this box could take, the least-moved ones first: staying
    // on the middle of its own line is the ideal, sliding along it is the
    // next best, and stepping off it is the last resort.
    const candidates = FILLER_POSITIONS.flatMap((t) =>
      FILLER_SIDESTEPS.map((step) => ({
        cost: Math.abs(t - 0.5) * 3 + Math.abs(step) / 60,
        rect: {
          x: a.x + (b.x - a.x) * t + perpX * step,
          y: a.y + (b.y - a.y) * t + perpY * step,
          w,
          h,
        } as Rect,
      })),
    ).sort((p, q) => p.cost - q.cost);

    let best: { rect: Rect; overlap: number } | null = null;
    for (const { rect } of candidates) {
      const overlap = placed.reduce((sum, other) => sum + overlapArea(rect, other, FILLER_GAP), 0);
      if (overlap === 0) {
        best = { rect, overlap };
        break;
      }
      if (!best || overlap < best.overlap) best = { rect, overlap };
    }
    const rect = best!.rect;
    placed.push(rect);
    result[i] = { x: rect.x, y: rect.y };
  }

  return result;
}

/** Every pair of people is connected — the graph is the whole group, not a tree. */
function edgesOf(nodes: Node[]): { a: Node; b: Node; key: string }[] {
  const edges: { a: Node; b: Node; key: string }[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      edges.push({ a: nodes[i], b: nodes[j], key: `${i}-${j}` });
    }
  }
  return edges;
}

export default function GroupGraph({
  name,
  members,
  footer,
  variant = "page",
}: {
  name: string;
  members: GroupChatMember[];
  /** Rendered on the paper just below the last character, inside the frame. */
  footer?: React.ReactNode;
  /**
   * "page" is the group chat itself: the group's name across the top, every
   * person named, and paper below to scroll onto. "highlights" is the same
   * graph as the exported card (Figma node 30:3643) — a fixed heading, no
   * names, and no tail, since the card is a fixed shape.
   */
  variant?: "page" | "highlights";
}) {
  const highlights = variant === "highlights";
  const totalH = highlights ? FRAME_H + HIGHLIGHTS_TAIL : TOTAL_H;
  const webScale = highlights ? HIGHLIGHTS_WEB_SCALE : 1;
  const nodes = layout(members, webScale, highlights ? HIGHLIGHTS_WEB_DROP : 0);
  const edges = edgesOf(nodes);
  const fillerEdges = chooseFillerEdges(edges);
  const charH = (members.length > 5 ? CHAR_H * 0.9 : CHAR_H) * webScale;
  const charW = charH / CHAR_ASPECT;
  const fillerScale = Math.min(1, Math.sqrt(FILLER_MAX / Math.max(1, fillerEdges.length)));
  const fillerW = FILLER_W * fillerScale * FILLER_FIT * webScale;
  const fillerH = FILLER_H * fillerScale * FILLER_FIT * webScale;
  const fillerSpots = placeFillers(fillerEdges, fillerW, fillerH);

  return (
    <div
      className="relative mx-auto w-full max-w-[520px] overflow-hidden"
      style={{ aspectRatio: `${FRAME_W} / ${totalH}` }}
    >
      {/* eslint-disable @next/next/no-img-element */}
      {/*
        The grid repeats down the frame rather than stretching, so the paper
        below the graph is more paper, not a blown-up tile. The tile is a
        cross-faded version of the circle page's (grid-tile-seamless.png):
        the original is a photograph whose own darker edges showed up as a
        tinted seam everywhere it repeated.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "url(/circle/grid-tile-seamless.png)",
          backgroundSize: "100% auto",
          backgroundRepeat: "repeat-y",
        }}
      />
      {/* The watercolour wash under the web. The exported card leaves it off: on that small a card it reads as a stain on the paper rather than as paint. */}
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

      {/* The thin red connectors, one per pair. */}
      <svg
        aria-hidden
        viewBox={`0 0 ${FRAME_W} ${totalH}`}
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        {edges.map(({ a, b, key }) => (
          <line key={key} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#FF0404" strokeWidth={2} />
        ))}
      </svg>

      {/* A filler box per connector — the slot a photo shared between those two people will go in. */}
      {fillerEdges.map(({ a, b, key }, i) => {
        const spot = fillerSpots[i];
        const nudge = nudgeFor(a.member.username, b.member.username);
        const x = spot.x + (nudge.x ?? 0);
        const y = spot.y + (nudge.y ?? 0);
        return (
          <div
            key={key}
            data-connection={`${a.member.username}--${b.member.username}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-[9px] bg-[#d9d9d9]"
            style={{
              left: pct(x, FRAME_W),
              top: pct(y, totalH),
              width: pct(fillerW, FRAME_W),
              height: pct(fillerH, totalH),
            }}
          />
        );
      })}

      {nodes.map((node, i) => (
        <img
          key={`char-${i}`}
          src={CHAR_SRC}
          alt=""
          aria-hidden
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 max-w-none object-contain"
          style={{
            left: pct(node.x, FRAME_W),
            top: pct(node.y, totalH),
            width: pct(charW, FRAME_W),
            height: pct(charH, totalH),
            // Mirror the people on the right so the group faces inward, as in the design.
            transform: `translate(-50%, -50%) scaleX(${node.outX > 0 ? -1 : 1})`,
          }}
        />
      ))}

      {!highlights && nodes.map((node, i) => (
        <p
          key={`label-${i}`}
          className="absolute -translate-x-1/2 -translate-y-1/2 break-words text-center font-mono text-[16px] leading-[1.2] text-[#c40505]"
          style={{
            left: pct(
              clamp(
                node.x + node.outX * LABEL_OFFSET_X,
                LABEL_W / 2 + LABEL_MARGIN,
                FRAME_W - LABEL_W / 2 - LABEL_MARGIN,
              ),
              FRAME_W,
            ),
            top: pct(
              node.y +
                node.outY * LABEL_OFFSET_Y -
                (node.upperSide ? UPPER_LABEL_LIFT : 0) +
                (node.lowerSide ? LOWER_LABEL_DROP : 0),
              totalH,
            ),
            width: pct(LABEL_W, FRAME_W),
          }}
        >
          {node.member.name}
        </p>
      ))}

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
          {name}
        </h1>
      )}

      {footer && (
        <div
          className="absolute left-1/2 flex w-full -translate-x-1/2 justify-center px-4"
          style={{ top: pct(FRAME_H - 24, totalH) }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
