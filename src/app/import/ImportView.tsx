"use client";
import { useState } from "react";
import Link from "next/link";
import TagAttendees from "@/app/import/TagAttendees";
import { useImportedEvents } from "@/lib/imported";
import type { Candidate, ImportResult } from "@/server/services/import";

export type Person = { id: string; name: string; emoji: string | null };

const when = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

export default function ImportView({ people }: { people: Person[] }) {
  const { events, ready, save, clear } = useImportedEvents();
  const [result, setResult] = useState<ImportResult | null>(null);
  const [tags, setTags] = useState<Record<string, string[]>>({});
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(0);

  async function scan() {
    setScanning(true);
    setError(null);
    setSaved(0);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gapHours: 6 }),
      });
      const data = (await res.json()) as ImportResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setResult(data);
      setTags({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setScanning(false);
    }
  }

  const toggle = (candidateId: string, personId: string) =>
    setTags((prev) => {
      const current = prev[candidateId] ?? [];
      return {
        ...prev,
        [candidateId]: current.includes(personId)
          ? current.filter((id) => id !== personId)
          : [...current, personId],
      };
    });

  const tagged = (result?.candidates ?? []).filter((c) => (tags[c.id] ?? []).length > 0);

  function confirm() {
    const byId = new Map(people.map((p) => [p.id, p.name]));
    save(
      tagged.map((c: Candidate) => {
        const attendeeIds = tags[c.id] ?? [];
        return {
          id: c.id,
          title: c.title,
          kind: c.kind,
          happenedAt: c.startsAt,
          photoCount: c.photoCount,
          attendeeIds,
          attendeeNames: attendeeIds.map((id) => byId.get(id) ?? id),
        };
      }),
    );
    setSaved(tagged.length);
    setResult(null);
    setTags({});
  }

  return (
    <div className="pt-8">
      <h1 className="font-display text-3xl">Import your camera roll</h1>
      <p className="mt-1 text-inkSoft">
        We read the dates on your photos — never the files themselves — and work out
        where one day out ended and the next began.
      </p>

      <button
        onClick={scan}
        disabled={scanning}
        className="mt-5 rounded-md bg-string px-4 py-2 text-paper disabled:opacity-60"
      >
        {scanning ? "Reading your roll…" : "Scan camera roll"}
      </button>

      {error && (
        <p className="mt-4 rounded-md border border-string/40 p-3 text-sm text-string">
          {error}
        </p>
      )}

      {saved > 0 && (
        <p className="mt-4 text-inkSoft">
          Saved {plural(saved, "event")}. Your strings just got thicker —{" "}
          <Link href="/circle" className="underline">
            see your circle
          </Link>
          .
        </p>
      )}

      {result && (
        <section className="mt-8">
          <h2 className="font-display text-xl">
            We found {plural(result.candidates.length, "event")} in your camera roll.
          </h2>
          <p className="mt-1 text-inkSoft">
            {plural(result.photoCount, "photo")} scanned
            {result.source === "fixture" && " from the sample roll — link Dropbox for your own"}
            . Who was with you?
          </p>

          <ul className="mt-5 space-y-5">
            {result.candidates.map((c) => (
              <li key={c.id} className="border-t border-ink/10 pt-4">
                <p className="font-display text-lg">{c.title}</p>
                <p className="text-sm text-inkSoft">
                  {when(c.startsAt)} · {plural(c.photoCount, "photo")} · {c.kind}
                </p>
                <TagAttendees
                  people={people}
                  selected={tags[c.id] ?? []}
                  onToggle={(personId) => toggle(c.id, personId)}
                />
              </li>
            ))}
          </ul>

          <button
            onClick={confirm}
            disabled={tagged.length === 0}
            className="mt-7 rounded-md bg-string px-4 py-2 text-paper disabled:opacity-40"
          >
            {tagged.length === 0
              ? "Tag someone to continue"
              : `Save ${plural(tagged.length, "event")}`}
          </button>
          <p className="mt-2 text-sm text-inkSoft">
            Untagged events are discarded — an event with nobody in it belongs to no
            string.
          </p>
        </section>
      )}

      {ready && events.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl">Imported</h2>
          <ul className="mt-3 space-y-3">
            {events.map((e) => (
              <li key={e.id} className="border-t border-ink/10 pt-3">
                <p className="font-display">{e.title}</p>
                <p className="text-sm text-inkSoft">
                  {when(e.happenedAt)} · {e.attendeeNames.join(", ")} ·{" "}
                  {plural(e.photoCount, "photo")}
                </p>
              </li>
            ))}
          </ul>
          <button onClick={clear} className="mt-6 text-sm text-inkSoft underline">
            Clear imported events
          </button>
        </section>
      )}
    </div>
  );
}
