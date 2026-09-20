"use client";
import { useMemo } from "react";
import Thread from "./Thread";
import { colorFor } from "@/server/domain/tiers";
import type { StringView } from "@/lib/types";

/**
 * The circle. One thread from you to every person you have history with.
 *
 * The layout is deterministic rather than force-simulated: your world should
 * look the same every time you open it, the way a map does. Thickest strings
 * go to the top and the rest alternate left and right, so the ones that
 * matter are never buried at the bottom of the ring.
 */

const W = 360;
const H = 360;

export default function GraphCanvas({
  strings,
  selectedId,
  onSelect,
}: {
  strings: StringView[];
  selectedId?: string | null;
  onSelect?: (s: StringView) => void;
}) {
  const placed = useMemo(() => {
    // strings arrive sorted by depth; fan them out from the top, alternating.
    const order: StringView[] = [];
    strings.forEach((s, i) => (i % 2 === 0 ? order.push(s) : order.unshift(s)));

    const count = Math.max(order.length, 1);
    return order.map((s, i) => {
      const angle = -Math.PI / 2 + (i / count) * Math.PI * 2;
      // Longer string = colder: distance is another read of the same fact.
      const radius = 96 + (1 - Math.min(s.warmth, 1)) * 48;
      return {
        s,
        x: W / 2 + Math.cos(angle) * radius,
        y: H / 2 + Math.sin(angle) * radius,
      };
    });
  }, [strings]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Your circle of strings"
    >
      {placed.map(({ s, x, y }, i) => (
        <Thread
          key={s.personId}
          x1={W / 2}
          y1={H / 2}
          x2={x}
          y2={y}
          depth={s.depth}
          warmth={s.warmth}
          animate
          delay={i * 90}
          dimmed={Boolean(selectedId) && selectedId !== s.personId}
        />
      ))}

      <g transform={`translate(${W / 2} ${H / 2})`}>
        <circle r={26} fill="var(--paper)" stroke="var(--ink)" strokeWidth={2.5} />
        <text textAnchor="middle" dominantBaseline="central" fontSize={18}>
          🧵
        </text>
      </g>

      {placed.map(({ s, x, y }) => (
        <g
          key={s.personId}
          transform={`translate(${x} ${y})`}
          tabIndex={0}
          role="button"
          aria-label={`${s.name}, ${s.tier}, ${s.eventCount} shared events`}
          onClick={() => onSelect?.(s)}
          onKeyDown={(e) => e.key === "Enter" && onSelect?.(s)}
          className="cursor-pointer"
          opacity={!selectedId || selectedId === s.personId ? 1 : 0.5}
        >
          <circle
            r={19}
            fill="var(--paper)"
            stroke={colorFor(s.warmth)}
            strokeWidth={selectedId === s.personId ? 3 : 1.75}
          />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={14}
            className="font-display"
            fill="var(--ink)"
          >
            {s.name.slice(0, 2)}
          </text>
          <text
            y={32}
            textAnchor="middle"
            fontSize={10}
            fill="var(--ink-soft)"
            className="font-display"
          >
            {s.name}
          </text>
        </g>
      ))}
    </svg>
  );
}
