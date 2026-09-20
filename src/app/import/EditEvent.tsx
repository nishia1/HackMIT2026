"use client";
import { KINDS } from "@/server/domain/label";

/**
 * Naming the outing.
 *
 * The title and kind arrive as guesses made from timestamps alone — "Saturday
 * evening", "dinner" — which are right often enough to keep and wrong often
 * enough to need fixing. Both are editable in place, and the kind picks the
 * emoji so nobody has to.
 */

export const CAPTION_MAX = 80;

export default function EditEvent({
  title,
  kind,
  onTitle,
  onKind,
}: {
  title: string;
  kind: string;
  onTitle: (value: string) => void;
  onKind: (value: string) => void;
}) {
  // A guessed kind outside the list would otherwise silently reset the select
  // to its first option, changing data the user never touched.
  const known = KINDS.some((k) => k.kind === kind);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={title}
        onChange={(e) => onTitle(e.target.value)}
        aria-label="What this was"
        placeholder="What was this?"
        className="min-w-0 flex-1 rounded-md border border-ink/20 bg-transparent px-3 py-1.5 font-display text-lg outline-none focus:border-string"
      />
      <select
        value={kind}
        onChange={(e) => onKind(e.target.value)}
        aria-label="Kind of outing"
        className="rounded-md border border-ink/20 bg-transparent px-2 py-1.5 text-sm text-inkSoft outline-none focus:border-string"
      >
        {!known && <option value={kind}>{kind}</option>}
        {KINDS.map((k) => (
          <option key={k.kind} value={k.kind}>
            {k.emoji} {k.kind}
          </option>
        ))}
      </select>
    </div>
  );
}
