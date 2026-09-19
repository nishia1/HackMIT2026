"use client";
import { useMemo, useState } from "react";
import Thread from "./Thread";
import type { GNode } from "@/lib/graph/types";

/**
 * Your Circle. Not a friend list — everything one hop out, people and courses
 * and clubs alike, because the point of the product is that they're the same
 * kind of thing.
 *
 * The layout is deterministic rather than force-simulated: your world should
 * look the same every time you open it, the way a map does. Nodes are grouped
 * into arcs by type so the eye can find "my classes" without a legend.
 */

const RING_ORDER: GNode["type"][] = [
  "PERSON",
  "CLUB",
  "PROJECT",
  "COURSE",
  "EVENT",
  "INTEREST",
  "COMMUNITY",
  "PLACE",
];

const TINT: Partial<Record<GNode["type"], string>> = {
  PERSON: "var(--string)",
  EVENT: "var(--stamp)",
  INTEREST: "var(--field)",
};

export default function GraphCanvas({
  center,
  nodes,
  links,
  onSelect,
}: {
  center: GNode;
  nodes: GNode[];
  links: { source: string; target: string; type: string }[];
  onSelect?: (node: GNode) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const W = 360;
  const H = 360;

  const positions = useMemo(() => {
    const sorted = [...nodes].sort(
      (a, b) => RING_ORDER.indexOf(a.type) - RING_ORDER.indexOf(b.type),
    );
    const map = new Map<string, { x: number; y: number }>();
    map.set(center.id, { x: W / 2, y: H / 2 });

    // Two rings so a busy world doesn't crowd into one circle.
    const inner = sorted.filter((_, i) => i % 2 === 0);
    const outer = sorted.filter((_, i) => i % 2 === 1);

    const place = (list: GNode[], radius: number, phase: number) =>
      list.forEach((n, i) => {
        const angle = phase + (i / Math.max(list.length, 1)) * Math.PI * 2;
        map.set(n.id, {
          x: W / 2 + Math.cos(angle) * radius,
          y: H / 2 + Math.sin(angle) * radius,
        });
      });

    place(inner, 98, -Math.PI / 2);
    place(outer, 152, -Math.PI / 2 + 0.4);
    return map;
  }, [nodes, center.id]);

  const isLit = (id: string) => !hover || hover === id || hover === center.id;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Your circle">
      {links.map((l, i) => {
        const a = positions.get(l.source);
        const b = positions.get(l.target);
        if (!a || !b) return null;
        const involvesMe = l.source === center.id || l.target === center.id;
        return (
          <Thread
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            strength={involvesMe ? 0.8 : 0.3}
            muted={!involvesMe || !isLit(l.target)}
          />
        );
      })}

      {[...nodes, center].map((n) => {
        const p = positions.get(n.id);
        if (!p) return null;
        const isMe = n.id === center.id;
        const r = isMe ? 26 : n.type === "PERSON" ? 19 : 15;
        return (
          <g
            key={n.id}
            transform={`translate(${p.x} ${p.y})`}
            tabIndex={0}
            role="button"
            aria-label={`${n.name}, ${n.type.toLowerCase()}`}
            onClick={() => onSelect?.(n)}
            onKeyDown={(e) => e.key === "Enter" && onSelect?.(n)}
            onMouseEnter={() => setHover(n.id)}
            onMouseLeave={() => setHover(null)}
            className="cursor-pointer"
            opacity={isLit(n.id) ? 1 : 0.45}
          >
            <circle
              r={r}
              fill="var(--paper)"
              stroke={isMe ? "var(--ink)" : (TINT[n.type] ?? "var(--ink-soft)")}
              strokeWidth={isMe ? 2.5 : 1.5}
            />
            <text textAnchor="middle" dominantBaseline="central" fontSize={isMe ? 20 : 14}>
              {n.emoji ?? n.name.slice(0, 1)}
            </text>
            <text
              y={r + 13}
              textAnchor="middle"
              fontSize={9.5}
              fill="var(--ink-soft)"
              className="font-display"
            >
              {n.name.length > 16 ? `${n.name.slice(0, 15)}…` : n.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
