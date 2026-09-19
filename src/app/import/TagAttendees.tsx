"use client";
import type { Person } from "@/app/import/ImportView";

/**
 * The only question the import asks. Everything else — when it was, how many
 * photos, what to call it — was worked out from the roll; who you were with is
 * the one thing the file metadata can never know.
 */
export default function TagAttendees({
  people,
  selected,
  onToggle,
}: {
  people: Person[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {people.map((p) => {
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
    </div>
  );
}
