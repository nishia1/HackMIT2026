/**
 * The exact vector path exported from Figma (node 30:3753 "Main_String"),
 * shared by every segment of the infinite string. Only the gradient stops
 * and the vertical flip differ between segments.
 */
export const MAIN_STRING_WIDTH = 377.339;
export const MAIN_STRING_HEIGHT = 941.037;

/**
 * The ribbon's outer boundary: a single closed outline that traces all the
 * way down one edge (through every loop) to the bottom tip, then all the way
 * back up the other edge to (roughly) the top. Used both for the reveal
 * animation (see below) and as the first subpath of MAIN_STRING_FILL_PATH.
 */
export const MAIN_STRING_PATH =
  "M51.8597 1.29688C41.8362 116.84 38.4453 211.952 51.971 281.168C58.7175 315.692 69.5742 343.197 85.4427 363.479C98.5975 380.291 115.402 392.407 136.832 399.409C144.206 395.139 151.319 390.409 158.621 385.483C167.713 379.351 177.145 372.884 187.312 367.062C205.512 356.637 226.234 348.166 253.256 346.066C239.477 324.911 232.831 306.206 232.032 289.854C231.173 272.291 237.098 257.997 247.091 247.128C256.94 236.416 270.457 229.313 284.618 225.204C298.81 221.087 314.087 219.843 327.963 221.204C341.71 222.552 354.82 226.535 364.127 233.574C368.844 237.142 372.755 241.631 375.08 247.108C377.434 252.652 377.978 258.787 376.572 265.239C373.832 277.81 363.816 291.202 346.284 305.336C329.561 318.817 305.185 333.624 271.32 349.622C329.82 380.073 359.795 411.16 370.096 443.061C380.784 476.16 369.563 507.795 352.14 536.361C334.9 564.626 310.011 592.192 291.93 616.02C282.679 628.211 275.104 639.504 270.383 650.001C266.051 659.634 264.391 668.011 265.556 675.462C288.844 667.982 308.113 666.649 323.766 670.479C333.218 672.791 341.227 676.963 347.833 682.621C354.421 688.264 359.452 695.244 363.163 702.998C370.541 718.411 372.83 737.11 371.838 755.648C370.842 774.259 366.514 793.268 360.107 809.676C356.898 817.892 353.134 825.543 348.941 832.217C344.762 838.866 340.054 844.708 334.899 849.159C329.761 853.595 323.866 856.914 317.38 857.9C310.701 858.916 304.086 857.345 298.024 853.187C292.124 849.139 286.93 842.785 282.361 834.387C277.771 825.952 273.619 815.103 269.971 801.612C265.798 786.18 262.222 767.042 259.442 743.675C257.154 746.442 254.6 748.99 251.824 751.349C243.234 758.648 232.502 764.183 221.098 769.118C209.879 773.973 196.811 778.719 184.411 783.751C158.97 794.075 133.106 806.815 112.787 829.966C92.6008 852.966 77.2573 886.995 74.4515 941.037L66.9613 940.648L59.472 940.26C62.4162 883.552 78.6779 846.09 101.514 820.071C124.218 794.203 152.794 780.394 178.771 769.853C192.08 764.452 203.968 760.187 215.142 755.352C226.131 750.596 235.232 745.763 242.111 739.918C248.836 734.203 253.383 727.568 255.422 718.972C255.887 717.014 256.228 714.92 256.43 712.675C255.943 706.399 255.507 699.882 255.118 693.117C254.822 691.578 254.479 689.991 254.089 688.355L253.821 687.684L251.03 680.723C251.111 680.69 251.193 680.657 251.275 680.624C248.51 668.347 251.282 655.901 256.702 643.849C262.136 631.766 270.546 619.385 279.981 606.951C299.273 581.527 322.572 556.032 339.334 528.55C355.913 501.368 364.507 474.567 355.822 447.67C347.096 420.648 320.211 391.223 260.041 360.691C232.903 361.777 212.763 369.771 194.767 380.078C185.183 385.567 176.262 391.678 167.009 397.919C161.013 401.964 154.889 406.05 148.505 409.923L146.863 417.609C146.724 417.58 146.587 417.548 146.449 417.519C154.268 440.764 156.518 460.533 154.325 477.123C151.754 496.563 143.117 511.284 130.95 521.62C118.901 531.856 103.762 537.492 88.4398 539.626C73.1123 541.761 57.2355 540.45 43.305 536.43C29.4828 532.44 16.8977 525.577 8.85481 516.01C4.78426 511.168 1.81257 505.544 0.598952 499.246C-0.621352 492.913 0.0111097 486.274 2.60579 479.573C7.71024 466.392 20.2787 453.211 41.0003 440.347C58.8489 429.266 83.3359 418.055 115.837 407.081C99.0985 398.932 85.1172 387.405 73.6292 372.723C55.788 349.92 44.2574 319.903 37.2503 284.046C23.269 212.5 26.9036 115.419 36.9163 0L51.8597 1.29688Z";

/**
 * The three small "woven" gaps cut where the ribbon crosses itself — wound
 * opposite the main outline so a nonzero-fill of MAIN_STRING_FILL_PATH shows
 * the background through them, giving the over/under look at each crossing.
 */
export const MAIN_STRING_HOLES = [
  "M320.202 685.049C308.008 682.065 291.595 682.825 269.952 689.805C269.98 690.3 270.009 690.794 270.036 691.286C271.458 699.042 271.929 706.137 271.477 712.659C274.383 749.488 278.934 777.295 284.451 797.696C291.463 823.631 299.647 836.11 306.508 840.817C309.648 842.971 312.459 843.476 315.124 843.07C317.984 842.635 321.354 841.037 325.096 837.806C332.674 831.262 340.222 819.357 346.133 804.219C351.986 789.231 355.953 771.791 356.86 754.848C357.77 737.833 355.569 721.872 349.634 709.474C343.821 697.328 334.438 688.532 320.202 685.049Z",
  "M130.724 417.979C93.7428 429.798 67.2148 441.728 48.9124 453.091C29.3756 465.22 19.9911 476.215 16.5931 484.989C14.937 489.266 14.6812 493.049 15.3284 496.408C15.9827 499.803 17.6347 503.143 20.3372 506.357C25.8409 512.904 35.3994 518.535 47.4642 522.018C59.4212 525.469 73.1771 526.607 86.3704 524.77C99.569 522.931 111.84 518.172 121.238 510.188C130.516 502.306 137.361 490.985 139.454 475.157C141.394 460.49 139.277 441.669 130.724 417.979Z",
  "M326.499 236.132C314.457 234.951 301.098 236.041 288.797 239.61C276.466 243.188 265.632 249.124 258.133 257.279C250.779 265.278 246.357 275.681 247.014 289.121C247.626 301.636 252.676 317.221 264.716 336.153C298.058 320.415 321.356 306.163 336.868 293.657C353.458 280.284 360.267 269.613 361.916 262.045C362.705 258.428 362.335 255.474 361.272 252.97C360.181 250.399 358.174 247.879 355.078 245.538C348.761 240.76 338.67 237.326 326.499 236.132Z",
];

/** The full visible ribbon shape, outline plus its woven crossing cutouts, rendered with `fill-rule: nonzero`. */
export const MAIN_STRING_FILL_PATH = [MAIN_STRING_PATH, ...MAIN_STRING_HOLES].join(" ");

/**
 * Odd-indexed segments continue the path visually flipped vertically (as
 * Figma's "Circle-2" frame does). Rather than mirroring on screen with a CSS
 * `transform: scaleY(-1)`, we mirror the path's own y-coordinates once here
 * — every M/L/C command in MAIN_STRING_PATH is absolute, so a coordinate's
 * parity (even index = x, odd index = y) tells us which numbers to reflect
 * about MAIN_STRING_HEIGHT/2.
 *
 * This keeps local path-space and on-screen space identical for every
 * segment, flipped or not, so the scroll-driven reveal below (which reasons
 * about "how far down the screen has the reveal line reached") stays valid
 * without a separate mirrored code path.
 */
function reflectPathY(d: string, height: number): string {
  const segments = d.match(/[MLC][^MLCZ]*|Z/g) ?? [];
  return segments
    .map((segment) => {
      const command = segment[0];
      if (command === "Z") return "Z";
      const numbers = segment
        .slice(1)
        .trim()
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number);
      const reflected = numbers.map((n, i) => (i % 2 === 1 ? height - n : n));
      return command + reflected.join(" ");
    })
    .join("");
}

export const FLIPPED_MAIN_STRING_PATH = reflectPathY(MAIN_STRING_PATH, MAIN_STRING_HEIGHT);
export const FLIPPED_MAIN_STRING_HOLES = MAIN_STRING_HOLES.map((hole) => reflectPathY(hole, MAIN_STRING_HEIGHT));
export const FLIPPED_MAIN_STRING_FILL_PATH = [FLIPPED_MAIN_STRING_PATH, ...FLIPPED_MAIN_STRING_HOLES].join(" ");

/** The three anchor colours the design cycles through, in scroll order. */
export const STRING_COLORS = ["#C38AFF", "#BD0000", "#000DFF"] as const;

/**
 * MAIN_STRING_PATH is a single closed outline: it traces all the way down
 * one edge of the ribbon (through every loop) to the bottom tip, then all
 * the way back up the other edge to (roughly) the top.
 *
 * To make the ribbon "grow" while still following its own loops (rather
 * than getting chopped by a flat horizontal line, or drawing as a thin
 * outline that only thickens once the whole path has been traced), we
 * reveal both edges at once, each growing from its own top (near y=0) down
 * toward the shared tip, in lockstep. Their union is always the full-width
 * ribbon up to the current point, because both edges bound the same
 * cross-section at any matching arc-length.
 *
 * Reveal length as a plain fraction of each edge's length only tracks the
 * scroll position correctly where the path descends roughly monotonically.
 * Inside the ribbon's self-overlapping loops the two traced edges cover very
 * different arc-lengths per unit of vertical height (an outer loop edge is
 * longer than the inner one it wraps), so equal length-fractions on the two
 * edges stop corresponding to the same on-screen height — the loop's reveal
 * desyncs from the scroll line instead of following the loop.
 *
 * To fix that we sample the real path geometry once (via getPointAtLength,
 * browser-only) and look up how far along each edge to reveal for a given
 * target y, using the running maximum y seen so far along that edge. That
 * keeps both edges locked to the same actual vertical position at every
 * point, including inside loops.
 *
 * For a flipped segment we can't reuse the canonical path's own arc-length
 * order: reflecting y (see reflectPathY) turns the canonical edges' near-top
 * start/end points into near-bottom ones and vice versa, so tracing "from
 * the start" would start revealing at the bottom of the tile and jump to
 * fully-drawn only once the scroll line neared the very bottom. Instead we
 * build the flipped edges by taking the canonical edges' sampled points,
 * reversing their order and reflecting y — which yields point sequences that
 * once again run from near y=0 down to the tip, exactly like the canonical
 * edges, just swapped (the canonical up-edge becomes the flipped down-edge
 * and vice versa).
 */
const FRONTIER_SAMPLES = 400;
const TIP_SEARCH_SAMPLES = 2000;

export type Point = { x: number; y: number };

export type EdgeModel = {
  /** Polyline `d` string for this edge, sampled from the source path, running from near y=0 down toward the tip. */
  pathD: string;
  totalLength: number;
  lengthForY: (targetY: number) => number;
  /** The (x, y) point at a given arc length along this edge — used to walk the character along the reveal frontier. */
  pointAtLength: (length: number) => Point;
};

export type RevealModel = {
  downEdge: EdgeModel;
  upEdge: EdgeModel;
};

function buildEdgeModel(points: Point[]): EdgeModel {
  const n = points.length;
  const cumLen = new Float64Array(n);
  const rawMaxY = new Float64Array(n);
  let runningMax = -Infinity;
  for (let i = 0; i < n; i++) {
    if (i > 0) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      cumLen[i] = cumLen[i - 1] + Math.hypot(dx, dy);
    }
    runningMax = Math.max(runningMax, points[i].y);
    rawMaxY[i] = runningMax;
  }

  // Inside a tight loop the path can run for a large stretch of arc length
  // while its running-max y barely moves (the loop curls back over ground
  // it already covered vertically). Looking up that stretch by y alone then
  // finds it all sitting at (almost) the same frontier index, so once the
  // scroll line reaches the loop's y, the whole loop's length becomes
  // "already passed" in one frame instead of unspooling as you keep
  // scrolling.
  //
  // Each such stall gets its own length-based boost, scaled to that stall's
  // own arc length and reset wherever y is actually still advancing — not a
  // single ramp shared across the whole path. A shared ramp's contribution
  // grows with cumulative length regardless of where a loop sits, so once
  // it's rescaled back to the original y span, a loop near the end of the
  // path ends up spread out far less than one near the start; resetting per
  // stall instead gives every loop the same treatment regardless of
  // position.
  const totalLen = cumLen[n - 1] || 1;
  const rawSpan = rawMaxY[n - 1] - rawMaxY[0] || 1;
  const boosted = new Float64Array(n);
  let runningBoosted = rawMaxY[0];
  let stallStartLen = cumLen[0];
  let stallStartBoosted = rawMaxY[0];
  boosted[0] = runningBoosted;
  for (let i = 1; i < n; i++) {
    if (rawMaxY[i] > runningBoosted) {
      runningBoosted = rawMaxY[i];
      stallStartLen = cumLen[i];
      stallStartBoosted = runningBoosted;
    } else {
      const stallLen = cumLen[i] - stallStartLen;
      const uncappedTerm = LOOP_SPREAD_FACTOR * (stallLen / totalLen) * rawSpan;
      const withLengthTerm = stallStartBoosted + Math.min(uncappedTerm, MAX_STALL_SPREAD_Y);
      runningBoosted = Math.max(runningBoosted, withLengthTerm);
    }
    boosted[i] = runningBoosted;
  }

  // Without a cap, a long, tightly-wound loop's uncapped term can run to
  // hundreds of y-units — once rescaled back to the real span below, that
  // pushes the loop's effective finish line far past its actual on-screen
  // position, so it's still visibly unspooling well after it's scrolled
  // past the reveal line instead of finishing while still in view.
  // MAX_STALL_SPREAD_Y keeps the extra scroll any single loop can demand
  // small enough that it closes promptly.
  //
  // The per-stall boosts can still push the running value past the path's
  // real final y, so rescale back to [rawMaxY[0], rawMaxY[n-1]] — otherwise
  // the last stretch of scroll would never fully reveal the ribbon.
  const boostedSpan = boosted[n - 1] - boosted[0] || 1;
  const maxY = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    maxY[i] = rawMaxY[0] + ((boosted[i] - boosted[0]) / boostedSpan) * rawSpan;
  }

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
  return {
    pathD,
    totalLength: cumLen[n - 1],
    lengthForY(targetY: number) {
      return cumLen[frontierIndexForY(maxY, targetY)];
    },
    pointAtLength: makePointAtLength(points, cumLen),
  };
}

/** Interpolates a point at a given arc length along a sampled polyline, given its points and cumulative per-point arc lengths. */
function makePointAtLength(points: Point[], cumLen: Float64Array): (length: number) => Point {
  const n = points.length;
  return (length: number) => {
    const target = Math.min(Math.max(length, 0), cumLen[n - 1]);
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumLen[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    if (lo === 0) return points[0];
    const segLen = cumLen[lo] - cumLen[lo - 1] || 1;
    const t = (target - cumLen[lo - 1]) / segLen;
    return {
      x: points[lo - 1].x + (points[lo].x - points[lo - 1].x) * t,
      y: points[lo - 1].y + (points[lo].y - points[lo - 1].y) * t,
    };
  };
}

/**
 * How much a loop's arc length (as a fraction of the edge's total length)
 * gets blended into its y-frontier before the running-max is taken, so
 * tightly-curled stretches still require additional scroll (not just a
 * hair's-width of y) to fully reveal. 0 = pure y-frontier (loops can snap in
 * almost instantly); higher values spread loops over more scroll but also
 * smear straighter stretches' timing slightly.
 */
const LOOP_SPREAD_FACTOR = 0.65;

/**
 * Hard cap, in path y-units, on how much extra "virtual" y a single loop's
 * stall can demand (see buildEdgeModel). Keeps every loop closing within a
 * short, predictable stretch of scroll rather than lagging behind until the
 * loop has already scrolled out of view.
 */
const MAX_STALL_SPREAD_Y = 35;

let canonicalGeometry: { downPoints: Point[]; upPoints: Point[] } | null = null;

/** Samples MAIN_STRING_PATH once into its down-edge (arc 0→downLength) and up-edge (arc totalLength→downLength) point sequences, both running from near y=0 toward the tip. */
function getCanonicalGeometry(): { downPoints: Point[]; upPoints: Point[] } {
  if (canonicalGeometry) return canonicalGeometry;

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", MAIN_STRING_PATH);
  const totalLength = path.getTotalLength();

  let downLength = 0;
  let deepestY = -Infinity;
  for (let i = 0; i <= TIP_SEARCH_SAMPLES; i++) {
    const len = (i / TIP_SEARCH_SAMPLES) * totalLength;
    const y = path.getPointAtLength(len).y;
    if (y > deepestY) {
      deepestY = y;
      downLength = len;
    }
  }
  const upLength = totalLength - downLength;

  const downPoints: Point[] = [];
  for (let i = 0; i <= FRONTIER_SAMPLES; i++) {
    const len = (i / FRONTIER_SAMPLES) * downLength;
    const p = path.getPointAtLength(len);
    downPoints.push({ x: p.x, y: p.y });
  }

  const upPoints: Point[] = [];
  for (let i = 0; i <= FRONTIER_SAMPLES; i++) {
    const len = totalLength - (i / FRONTIER_SAMPLES) * upLength;
    const p = path.getPointAtLength(len);
    upPoints.push({ x: p.x, y: p.y });
  }

  canonicalGeometry = { downPoints, upPoints };
  return canonicalGeometry;
}

const revealModels = new Map<boolean, RevealModel>();

/** Builds (and caches) the reveal model for a segment, unflipped or flipped. */
export function getRevealModel(flipped: boolean): RevealModel {
  const cached = revealModels.get(flipped);
  if (cached) return cached;

  const { downPoints, upPoints } = getCanonicalGeometry();

  const model: RevealModel = flipped
    ? {
        downEdge: buildEdgeModel(reflectPoints(upPoints)),
        upEdge: buildEdgeModel(reflectPoints(downPoints)),
      }
    : {
        downEdge: buildEdgeModel(downPoints),
        upEdge: buildEdgeModel(upPoints),
      };

  revealModels.set(flipped, model);
  return model;
}

/** Reverses point order and reflects y about MAIN_STRING_HEIGHT, turning a "runs from near y=0 to the tip" sequence into another one for the opposite edge of a flipped segment. */
function reflectPoints(points: Point[]): Point[] {
  const reversed = [...points].reverse();
  return reversed.map((p) => ({ x: p.x, y: MAIN_STRING_HEIGHT - p.y }));
}

/** First index whose (non-decreasing) maxY reaches targetY. */
function frontierIndexForY(maxY: Float64Array, targetY: number): number {
  if (targetY <= maxY[0]) return 0;
  const last = maxY.length - 1;
  if (targetY >= maxY[last]) return last;
  let lo = 0;
  let hi = last;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (maxY[mid] < targetY) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Stroke width used to mask-in the ribbon along each traced edge — wide enough to bridge the ribbon's own thickness at any point, and (with REVEAL_EDGE_LAG) to still fully cover the cross-section near a lagging edge's growing tip. */
export const REVEAL_STROKE_WIDTH = 110;

/**
 * How far behind the down edge's y-target the up edge's is kept, in path
 * units, so the two edges' loops resolve one after another instead of in
 * unison. Kept small relative to MAX_STALL_SPREAD_Y — this lag stacks on
 * top of that per-loop spread for the up edge, so a large value here was
 * an independent source of loops still visibly unspooling well after
 * they'd scrolled past the reveal line.
 */
export const REVEAL_EDGE_LAG = 90;

export type LabelAnchor = { left: number; top: number; width: number };

/** Min/max x and y over every coordinate in an SVG path `d` string (regardless of command structure). */
function pathBounds(d: string): { minX: number; maxX: number; minY: number; maxY: number } {
  const nums = d.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = nums[i];
    const y = nums[i + 1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, maxX, minY, maxY };
}

/**
 * A group-chat label's anchor, centered on a loop's own woven "hole" (see
 * MAIN_STRING_HOLES) — the actual open interior of the loop — rather than
 * hand-tuned percentages. Hand-tuned values drifted: they were eyeballed
 * once against a screenshot, so nothing kept them pinned to the loop as the
 * geometry was iterated on elsewhere, and they ended up sitting next to a
 * loop rather than inside it.
 *
 * `left`/`top` are the hole's own center point, not a box corner — the
 * label is centered on it with a CSS `translate(-50%, -50%)` (see
 * InfiniteMainString.tsx) so it stays centered regardless of how many lines
 * the name wraps to, rather than assuming a fixed text height up front.
 * `width` is 70% of the hole's own width, so the label text sits clear of
 * the ribbon strands bounding the loop rather than touching them.
 */
function labelAnchorForHole(holePath: string): LabelAnchor {
  const { minX, maxX, minY, maxY } = pathBounds(holePath);
  const width = maxX - minX;
  return {
    left: (((minX + maxX) / 2) / MAIN_STRING_WIDTH) * 100,
    top: (((minY + maxY) / 2) / MAIN_STRING_HEIGHT) * 100,
    width: ((width * 0.7) / MAIN_STRING_WIDTH) * 100,
  };
}

/**
 * Group-chat label anchors, one per loop (every woven hole gets a label).
 * Segment 0 uses NORMAL, segment 1 (vertically flipped, continuing the
 * path) uses FLIPPED, and the pair repeats for every subsequent pair of
 * segments.
 */
export const NORMAL_LABELS: LabelAnchor[] = MAIN_STRING_HOLES.map(labelAnchorForHole);

export const FLIPPED_LABELS: LabelAnchor[] = FLIPPED_MAIN_STRING_HOLES.map(labelAnchorForHole);
