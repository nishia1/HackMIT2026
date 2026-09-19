"use client";
import { useCallback, useEffect, useState } from "react";

/**
 * Your passport lives in the browser for now — no accounts, no database, and
 * it survives a refresh, which is all a demo needs. Swap the two helpers below
 * for API calls when you add real storage.
 */

const KEY = "invisible-string:passport:v1";

export type Followed = {
  personId: string;
  personName: string;
  headline: string;
  path: string[];
  followedAt: string;
};

function read(): Followed[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Followed[]) : [];
  } catch {
    return [];
  }
}

function write(entries: Followed[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    // Private browsing, quota, whatever. The app still works, it just forgets.
  }
}

export function usePassport() {
  const [entries, setEntries] = useState<Followed[]>([]);
  const [ready, setReady] = useState(false);

  // Read after mount so the server and client render the same first paint.
  useEffect(() => {
    setEntries(read());
    setReady(true);
  }, []);

  const follow = useCallback((entry: Omit<Followed, "followedAt">) => {
    setEntries((prev) => {
      if (prev.some((e) => e.personId === entry.personId)) return prev;
      const next = [{ ...entry, followedAt: new Date().toISOString() }, ...prev];
      write(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    write([]);
    setEntries([]);
  }, []);

  const hasFollowed = useCallback(
    (personId: string) => entries.some((e) => e.personId === personId),
    [entries],
  );

  return { entries, ready, follow, clear, hasFollowed };
}
