"use client";
import { useCallback, useEffect, useState } from "react";

/**
 * The setup strip at the top of the import screen: who you are, and which
 * folder we scan.
 *
 * There is no "connect Dropbox" step — signing in *was* connecting Dropbox.
 * The folder is still asked for rather than guessed: /Camera Uploads only
 * exists if you set up Dropbox's own phone sync, and for everyone else the
 * roll is under some name we have no way to know.
 */

export type Connection = { folder: string | null };

type Folder = { name: string; path: string };

export default function ConnectDropbox({
  me,
  connection,
  onFolderChange,
}: {
  me: { name: string };
  connection: Connection;
  onFolderChange: (folder: string) => void;
}) {
  const [folders, setFolders] = useState<Folder[] | null>(null);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dropbox/folders");
      const data = (await res.json()) as { folders?: Folder[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not read your folders");
      setFolders(data.folders ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read your folders");
    } finally {
      setBusy(false);
    }
  }, []);

  // No folder chosen is the one state the user cannot get out of on their own,
  // so the picker opens itself.
  useEffect(() => {
    if (!connection.folder) {
      setPicking(true);
      void load();
    }
  }, [connection.folder, load]);

  async function choose(path: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dropbox/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: path }),
      });
      const data = (await res.json()) as { folder?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save that folder");
      onFolderChange(path);
      setPicking(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that folder");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-md border border-ink/15 p-4">
      <p className="text-sm text-inkSoft">
        {me.name} · Dropbox connected
        {connection.folder && (
          <>
            {" "}
            · scanning <span className="font-display text-ink">{connection.folder}</span>{" "}
            <button
              type="button"
              onClick={() => {
                setPicking(true);
                void load();
              }}
              className="underline"
            >
              change
            </button>
          </>
        )}
      </p>

      {picking && (
        <div className="mt-3">
          <p className="text-sm text-inkSoft">Which folder holds your camera roll?</p>
          {busy && !folders && <p className="mt-2 text-sm text-inkSoft">Loading folders…</p>}
          {folders && folders.length === 0 && (
            <p className="mt-2 text-sm text-inkSoft">
              No folders at the top of your Dropbox.
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {folders?.map((f) => (
              <button
                key={f.path}
                type="button"
                disabled={busy}
                onClick={() => choose(f.path)}
                className="rounded-full border border-ink/20 px-3 py-1 text-sm text-inkSoft disabled:opacity-50"
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-string">{error}</p>}
    </section>
  );
}
