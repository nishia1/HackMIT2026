"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import TagAttendees from "@/app/import/TagAttendees";
import AddPerson from "@/app/import/AddPerson";
import ConnectDropbox, { type Connection } from "@/app/import/ConnectDropbox";
import EditEvent, { CAPTION_MAX } from "@/app/import/EditEvent";
import type { Candidate, ImportResult } from "@/server/services/import";
import type { EventDoc } from "@/lib/types";

export type Person = { id: string; name: string; emoji: string | null };

/** What the user can change about a guessed event before it is saved. */
type EventEdit = { title: string; kind: string };

const when = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

export default function ImportView({
  people: initialPeople,
  me,
  connection: initialConnection,
  initialError,
}: {
  people: Person[];
  me: { name: string };
  connection: Connection;
  initialError: string | null;
}) {
  const [people, setPeople] = useState<Person[]>(initialPeople);
  const [connection, setConnection] = useState<Connection>(initialConnection);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [tags, setTags] = useState<Record<string, string[]>>({});
  /** Candidate id → the title and kind as edited. */
  const [edits, setEdits] = useState<Record<string, EventEdit>>({});
  /** Dropbox path → caption. Flat across candidates, since paths are unique. */
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [saved, setSaved] = useState<{ added: number; skipped: number } | null>(null);
  const [stored, setStored] = useState<EventDoc[]>([]);

  const ready = Boolean(connection.folder);

  const nameList = (ids: string[]) => {
    const byId = new Map(people.map((p) => [p.id, p.name]));
    return ids.map((id) => byId.get(id) ?? id).join(", ");
  };

  // A new person goes to the front: you just named them, so they are almost
  // certainly who you are about to tag.
  const addPerson = (person: Person) =>
    setPeople((prev) =>
      prev.some((p) => p.id === person.id) ? prev : [person, ...prev],
    );

  // What is already in the database, so a refresh shows your real history.
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/events");
      const data = (await res.json()) as { events?: EventDoc[] };
      if (res.ok) setStored(data.events ?? []);
    } catch {
      // No database yet is a fine state — the import screen still works.
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function scan() {
    setScanning(true);
    setError(null);
    setSaved(null);
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
      setCaptions({});
      // The guessed title and kind are the starting point for editing, so they
      // become state the moment a scan lands.
      setEdits(
        Object.fromEntries(
          data.candidates.map((c) => [c.id, { title: c.title, kind: c.kind }]),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setScanning(false);
    }
  }

  const edit = (candidateId: string, patch: Partial<EventEdit>) =>
    setEdits((prev) => ({ ...prev, [candidateId]: { ...prev[candidateId], ...patch } }));

  const setCaption = (path: string, value: string) =>
    setCaptions((prev) => ({ ...prev, [path]: value.slice(0, CAPTION_MAX) }));

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

  /**
   * Copy this event's people onto every later one that is still untagged. A
   * weekend away is six candidates and one set of friends; without this it is
   * also six rounds of the same taps.
   */
  function applyToRest(fromId: string) {
    const attendees = tags[fromId] ?? [];
    const candidates = result?.candidates ?? [];
    const after = candidates.slice(candidates.findIndex((c) => c.id === fromId) + 1);
    setTags((prev) => {
      const next = { ...prev };
      for (const c of after) if (!(next[c.id] ?? []).length) next[c.id] = [...attendees];
      return next;
    });
  }

  const tagged = (result?.candidates ?? []).filter((c) => (tags[c.id] ?? []).length > 0);

  async function confirm() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          events: tagged.map((c: Candidate) => ({
            id: c.id,
            title: (edits[c.id]?.title ?? c.title).trim() || c.title,
            kind: edits[c.id]?.kind ?? c.kind,
            happenedAt: c.startsAt,
            attendeeIds: tags[c.id] ?? [],
            photoPaths: c.photoPaths,
            // Only this event's photos, so one candidate's captions cannot
            // ride along on another's write.
            captions: Object.fromEntries(
              c.samplePaths
                .filter((p) => captions[p]?.trim())
                .map((p) => [p, captions[p]]),
            ),
          })),
        }),
      });
      const data = (await res.json()) as { added?: number; updated?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save events");
      setSaved({ added: data.added ?? 0, skipped: data.updated ?? 0 });
      setResult(null);
      setTags({});
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save events");
    } finally {
      setSaving(false);
    }
  }

  // The tab bar is fixed to the bottom; without this the last button sits under it.
  return (
    <div className="pb-16 pt-8">
      <h1 className="font-display text-3xl">Import your camera roll</h1>
      <p className="mt-1 text-inkSoft">
        We read the dates on your photos — never the files themselves — and work out
        where one day out ended and the next began.
      </p>

      <div className="mt-5">
        <ConnectDropbox
          me={me}
          connection={connection}
          onFolderChange={(folder) => setConnection((c) => ({ ...c, folder }))}
        />
      </div>

      {ready && (
        <button
          onClick={scan}
          disabled={scanning}
          className="mt-5 rounded-md bg-string px-4 py-2 text-paper disabled:opacity-60"
        >
          {scanning ? "Reading your roll…" : "Scan camera roll"}
        </button>
      )}

      {error && (
        <p className="mt-4 rounded-md border border-string/40 p-3 text-sm text-string">
          {error}
        </p>
      )}

      {saved && (
        <p className="mt-4 text-inkSoft">
          {saved.added > 0 ? (
            <>
              Saved {plural(saved.added, "event")}. Your strings just got thicker —{" "}
              <Link href="/circle" className="underline">
                see your circle
              </Link>
              .
            </>
          ) : (
            <>
              Already imported — {plural(saved.skipped, "event")} left as {saved.skipped === 1 ? "it was" : "they were"}.
            </>
          )}
        </p>
      )}

      {result && (
        <section className="mt-8">
          <h2 className="font-display text-xl">
            We found {plural(result.candidates.length, "event")} in your camera roll.
          </h2>
          <p className="mt-1 text-inkSoft">
            {plural(result.photoCount, "photo")} scanned. Who was with you?
          </p>

          <ul className="mt-5 space-y-5">
            {result.candidates.map((c) => (
              <li key={c.id} className="border-t border-ink/10 pt-4">
                <EditEvent
                  title={edits[c.id]?.title ?? c.title}
                  kind={edits[c.id]?.kind ?? c.kind}
                  onTitle={(title) => edit(c.id, { title })}
                  onKind={(kind) => edit(c.id, { kind })}
                />
                <p className="mt-1 text-sm text-inkSoft">
                  {when(c.startsAt)} · {plural(c.photoCount, "photo")}
                </p>
                {c.sampleUrls.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    {c.sampleUrls.map((src, i) => {
                      const path = c.samplePaths[i];
                      return (
                        <figure key={src} className="w-20">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={src}
                            alt=""
                            loading="lazy"
                            className="h-20 w-20 rounded-md border border-ink/15 object-cover"
                          />
                          <input
                            value={captions[path] ?? ""}
                            onChange={(e) => setCaption(path, e.target.value)}
                            maxLength={CAPTION_MAX}
                            placeholder="Caption…"
                            aria-label="Caption for this photo"
                            className="mt-1 w-full rounded border border-ink/15 bg-transparent px-1.5 py-1 text-xs outline-none focus:border-string"
                          />
                        </figure>
                      );
                    })}
                  </div>
                )}
                {people.length === 0 && (
                  <p className="mt-3 text-sm text-inkSoft">
                    You have not added anyone yet. Whoever you were with goes here.
                  </p>
                )}
                <TagAttendees
                  people={people}
                  selected={tags[c.id] ?? []}
                  onToggle={(personId) => toggle(c.id, personId)}
                />
                <div className="mt-2">
                  <AddPerson onAdded={(person) => addPerson(person)} />
                </div>
                {(tags[c.id] ?? []).length > 0 && (
                  <button
                    type="button"
                    onClick={() => applyToRest(c.id)}
                    className="mt-2 text-sm text-inkSoft underline"
                  >
                    Same people for the rest
                  </button>
                )}
              </li>
            ))}
          </ul>

          <button
            onClick={confirm}
            disabled={tagged.length === 0 || saving}
            className="mt-7 rounded-md bg-string px-4 py-2 text-paper disabled:opacity-40"
          >
            {saving
              ? "Saving…"
              : tagged.length === 0
                ? "Tag someone to continue"
                : `Save ${plural(tagged.length, "event")}`}
          </button>
          <p className="mt-2 text-sm text-inkSoft">
            Untagged events are discarded — an event with nobody in it belongs to no
            string.
          </p>
        </section>
      )}

      {stored.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl">Imported</h2>
          <ul className="mt-3 space-y-3">
            {stored.map((e) => (
              <li key={e._id} className="border-t border-ink/10 pt-3">
                <p className="font-display">{e.title}</p>
                <p className="text-sm text-inkSoft">
                  {when(e.happenedAt)} · {nameList(e.attendeeIds)} ·{" "}
                  {plural(e.memories.length, "photo")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
