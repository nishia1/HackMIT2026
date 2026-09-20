"use client";
import { useMemo, useState } from "react";
import type { Person } from "@/app/import/ImportView";

/**
 * The only question the import asks. Everything else — when it was, how many
 * photos, what to call it — was worked out from the roll; who you were with is
 * the one thing the file metadata can never know.
 *
 * People arrive already ordered by who you saw most recently, so the common
 * case is tapping one of the first few chips. Search exists for the long tail,
 * and only appears once the list is long enough to need it.
 */

const SEARCH_AFTER = 8;
const COLLAPSED = 12;

export default function TagAttendees({
  people,
  selected,
  onToggle,
}: {
  people: Person[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) => p.name.toLowerCase().includes(q));
  }, [people, query]);

  // Whoever is already tagged stays visible even when the list is trimmed —
  // a selection you cannot see is a selection you cannot undo.
  const visible = useMemo(() => {
    if (expanded || query.trim() || matches.length <= COLLAPSED) return matches;
    const head = matches.slice(0, COLLAPSED);
    const shown = new Set(head.map((p) => p.id));
    return [...head, ...matches.filter((p) => selected.includes(p.id) && !shown.has(p.id))];
  }, [matches, expanded, query, selected]);

  const hidden = matches.length - visible.length;

  return (
    <div className="mt-3">
      {people.length > SEARCH_AFTER && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people…"
          aria-label="Search people"
          className="w-full rounded-md border border-ink/20 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-string"
        />
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        {visible.map((p) => {
          const on = selected.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(p.id)}
              className="rounded-full border px-3 py-1 text-sm transition-colors"
              style={{
                borderColor: on ? "var(--string)" : "rgba(34,27,58,0.2)",
                background: on ? "var(--string)" : "transparent",
                color: on ? "var(--paper)" : "var(--ink-soft)",
              }}
            >
              {p.emoji ? `${p.emoji} ` : ""}
              {p.name}
            </button>
          );
        })}

        {hidden > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-full px-3 py-1 text-sm text-inkSoft underline"
          >
            {hidden} more
          </button>
        )}
      </div>

      {query.trim() && matches.length === 0 && (
        <p className="mt-2 text-sm text-inkSoft">No one by that name.</p>
      )}
    </div>
  );
}
