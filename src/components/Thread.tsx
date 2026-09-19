"use client";

/**
 * A thread between two points.
 *
 * Deliberately not a straight line and not a clean arc: the control point is
 * pushed perpendicular to the run and jittered by a hash of the endpoints, so
 * every thread has its own slight bow and no two are identical. Straight lines
 * read as a network diagram. Uneven bowed ones read as string.
 */

function hash(a: number, b: number) {
  const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function threadPath(x1: number, y1: number, x2: number, y2: number, bow = 0.18) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const wobble = (hash(x1 + y2, x2 + y1) - 0.5) * 2;
  const off = len * bow * wobble;
  return {
    d: `M ${x1} ${y1} Q ${mx + (-dy / len) * off} ${my + (dx / len) * off} ${x2} ${y2}`,
    length: len * 1.15,
  };
}

export default function Thread({
  x1,
  y1,
  x2,
  y2,
  strength = 1,
  animate = false,
  muted = false,
  delay = 0,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strength?: number;
  animate?: boolean;
  muted?: boolean;
  delay?: number;
}) {
  const { d, length } = threadPath(x1, y1, x2, y2);
  return (
    <path
      d={d}
      fill="none"
      stroke={muted ? "var(--ink-soft)" : "var(--string)"}
      strokeOpacity={muted ? 0.28 : 0.45 + strength * 0.45}
      strokeWidth={muted ? 1 : 1 + strength * 1.6}
      strokeLinecap="round"
      className={animate ? "thread-draw" : undefined}
      style={
        animate
          ? ({ "--len": length, animationDelay: `${delay}ms` } as React.CSSProperties)
          : undefined
      }
    />
  );
}
