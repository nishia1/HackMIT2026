"use client";
import { useCallback, useEffect, useState } from "react";

/**
 * Confirmed events live in the browser, the same way the passport does — no
 * accounts, survives a refresh. When the events collection is real, swap the
 * two helpers for API calls; the import screen does not change.
 */

const KEY = "invisible-string:events:v1";

export type ImportedEvent = {
  id: string;
  title: string;
  kind: string;
  happenedAt: string;
  photoCount: number;
  attendeeIds: string[];
  attendeeNames: string[];
  importedAt: string;
};

function read(): ImportedEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ImportedEvent[]) : [];
  } catch {
    return [];
  }
}

function write(events: ImportedEvent[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(events));
  } catch {
    // Private browsing, quota, whatever. The app still works, it just forgets.
  }
}

export function useImportedEvents() {
  const [events, setEvents] = useState<ImportedEvent[]>([]);
  const [ready, setReady] = useState(false);

  // Read after mount so the server and client render the same first paint.
  useEffect(() => {
    setEvents(read());
    setReady(true);
  }, []);

  const save = useCallback((incoming: Omit<ImportedEvent, "importedAt">[]) => {
    setEvents((prev) => {
      const seen = new Set(prev.map((e) => e.id));
      const importedAt = new Date().toISOString();
      const added = incoming
        .filter((e) => !seen.has(e.id))
        .map((e) => ({ ...e, importedAt }));
      const next = [...added, ...prev].sort(
        (a, b) => +new Date(b.happenedAt) - +new Date(a.happenedAt),
      );
      write(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    write([]);
    setEvents([]);
  }, []);

  return { events, ready, save, clear };
}
