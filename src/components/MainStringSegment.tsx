import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from "react";
import {
  FLIPPED_MAIN_STRING_FILL_PATH,
  MAIN_STRING_FILL_PATH,
  MAIN_STRING_HEIGHT,
  MAIN_STRING_WIDTH,
  REVEAL_EDGE_LAG,
  REVEAL_STROKE_WIDTH,
  getRevealModel,
  type RevealModel,
} from "./mainStringPath";

export type MainStringSegmentHandle = {
  /** 0 = nothing drawn yet, 1 = the whole ribbon is drawn. */
  setReveal: (progress: number) => void;
};

/**
 * One tile of the infinite Main_String. `flipped` continues the path as
 * Figma's "Circle-2" frame does — by using a path whose y-coordinates are
 * pre-mirrored (see mainStringPath.ts), not a CSS `transform: scaleY(-1)`.
 * That keeps local path-space and on-screen space identical for every
 * segment, so the scroll-driven reveal below (which reasons in on-screen
 * terms) doesn't need separate handling for flipped segments — using a CSS
 * flip here used to make the ribbon grow upward on screen for flipped
 * segments instead of downward.
 *
 * The ribbon is revealed by tracing its own outline (see mainStringPath.ts)
 * rather than a rectangular clip, so it grows by following its loops.
 * getRevealModel measures the real path geometry via getPointAtLength, which
 * needs a browser, so it's built in a layout effect (not render) and applied
 * to the mask paths imperatively — that keeps this component SSR-safe while
 * still landing before the first client paint.
 *
 * The up edge is fed a y-target that trails REVEAL_EDGE_LAG behind the down
 * edge's (see setReveal below), rather than the same target both edges used
 * to share. With a shared target, a loop that happens to sit at a similar
 * height on both edges finishes on both at once, which read as two loops
 * popping in together instead of one drawing after the other. Each edge's
 * stroke is already wide enough on its own to cover the ribbon's local
 * cross-section (see REVEAL_STROKE_WIDTH), so lagging one edge doesn't open
 * a gap — it just staggers which edge's loop resolves first.
 */
const MainStringSegment = forwardRef<MainStringSegmentHandle, {
  gradientId: string;
  topColor: string;
  bottomColor: string;
  flipped: boolean;
}>(function MainStringSegment({ gradientId, topColor, bottomColor, flipped }, ref) {
  const downRef = useRef<SVGPathElement | null>(null);
  const upRef = useRef<SVGPathElement | null>(null);
  const modelRef = useRef<RevealModel | null>(null);

  const maskId = `${gradientId}-reveal-mask`;
  const fillPath = flipped ? FLIPPED_MAIN_STRING_FILL_PATH : MAIN_STRING_FILL_PATH;

  useLayoutEffect(() => {
    const model = getRevealModel(flipped);
    modelRef.current = model;
    if (downRef.current) {
      downRef.current.setAttribute("d", model.downEdge.pathD);
      downRef.current.style.strokeDasharray = `${model.downEdge.totalLength} ${model.downEdge.totalLength}`;
      downRef.current.style.strokeDashoffset = `${model.downEdge.totalLength}`;
    }
    if (upRef.current) {
      upRef.current.setAttribute("d", model.upEdge.pathD);
      upRef.current.style.strokeDasharray = `${model.upEdge.totalLength} ${model.upEdge.totalLength}`;
      upRef.current.style.strokeDashoffset = `${model.upEdge.totalLength}`;
    }
  }, [flipped]);

  useImperativeHandle(ref, () => ({
    setReveal(progress: number) {
      const model = modelRef.current;
      if (!model) return;
      const p = Math.min(1, Math.max(0, progress));
      const targetY = p * MAIN_STRING_HEIGHT;
      const downLen = model.downEdge.lengthForY(targetY);
      const upLen = model.upEdge.lengthForY(Math.max(0, targetY - REVEAL_EDGE_LAG));
      if (downRef.current) {
        downRef.current.style.strokeDashoffset = `${model.downEdge.totalLength - downLen}`;
      }
      if (upRef.current) {
        upRef.current.style.strokeDashoffset = `${model.upEdge.totalLength - upLen}`;
      }
    },
  }));

  return (
    <svg
      preserveAspectRatio="none"
      viewBox={`0 0 ${MAIN_STRING_WIDTH} ${MAIN_STRING_HEIGHT}`}
      className="block w-full h-full"
    >
      <defs>
        <linearGradient id={gradientId} x1={MAIN_STRING_WIDTH / 2} y1="0" x2={MAIN_STRING_WIDTH / 2} y2={MAIN_STRING_HEIGHT} gradientUnits="userSpaceOnUse">
          <stop stopColor={topColor} />
          <stop offset="1" stopColor={bottomColor} />
        </linearGradient>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={MAIN_STRING_WIDTH} height={MAIN_STRING_HEIGHT}>
          {/* `d`/dasharray/dashoffset are set imperatively in the layout effect above, once the real per-flip model is measured client-side — until then these render as empty paths, keeping the mask (and so the ribbon) hidden. */}
          <path
            ref={downRef}
            fill="none"
            stroke="white"
            strokeWidth={REVEAL_STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            ref={upRef}
            fill="none"
            stroke="white"
            strokeWidth={REVEAL_STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </mask>
      </defs>
      <path d={fillPath} fillRule="nonzero" fill={`url(#${gradientId})`} mask={`url(#${maskId})`} />
    </svg>
  );
});

export default MainStringSegment;
