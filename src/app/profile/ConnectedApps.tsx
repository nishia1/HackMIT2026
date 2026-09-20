"use client";
import { useState } from "react";

/**
 * Real OAuth for any of these is a whole flow each (Spotify has one, Beli has
 * no public API at all, Instagram's is business accounts only). So for now
 * "connect" means "tell us your username": it's typed in, lightly validated,
 * and handed to the parent through `onChange`. Nothing is verified against
 * the service yet. "Or paste anything" on the profile page is the working
 * version of the same idea.
 */

type AppId = "spotify" | "beli" | "instagram";

/** Connected apps and the username typed in for each. Missing key = not connected. */
export type ConnectedHandles = Partial<Record<AppId, string>>;

type AppSpec = {
  id: AppId;
  name: string;
  blurb: string;
  placeholder: string;
  color: string;
  Icon: (props: { className?: string }) => React.ReactElement;
};

const APPS: AppSpec[] = [
  {
    id: "spotify",
    name: "Spotify",
    blurb: "Top genres and artists become interests",
    placeholder: "your Spotify username",
    color: "#1DB954",
    Icon: SpotifyIcon,
  },
  {
    id: "beli",
    name: "Beli",
    blurb: "Your ranked restaurants, for real venue matches",
    placeholder: "your Beli username",
    color: "#FF4D6D",
    Icon: BeliIcon,
  },
  {
    id: "instagram",
    name: "Instagram",
    blurb: "Saved places and tagged spots",
    placeholder: "your Instagram username",
    color: "#C13584",
    Icon: InstagramIcon,
  },
];

const HANDLE_RE = /^[A-Za-z0-9._-]{2,30}$/;

/** Accepts "@linh.eats", " linh.eats ", etc. */
const clean = (raw: string) => raw.trim().replace(/^@+/, "");

export default function ConnectedApps({
  initial = {},
  onChange,
}: {
  /** Handles already saved, if you load them from the profile. */
  initial?: ConnectedHandles;
  /** Called whenever an app is connected or disconnected. */
  onChange?: (handles: ConnectedHandles) => void;
}) {
  const [handles, setHandles] = useState<ConnectedHandles>(initial);
  const [editing, setEditing] = useState<AppId | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<AppId | null>(null);

  const commit = (next: ConnectedHandles) => {
    setHandles(next);
    onChange?.(next);
  };

  const open = (id: AppId) => {
    setEditing(id);
    setDraft("");
    setError(null);
  };

  const cancel = () => {
    setEditing(null);
    setError(null);
  };

  const submit = (id: AppId) => {
    if (busy !== null) return;
    const value = clean(draft);
    if (!HANDLE_RE.test(value)) {
      setError("Use 2 to 30 letters, numbers, dots, dashes or underscores.");
      return;
    }
    setError(null);
    setBusy(id);
    // Short delay so "Connecting…" reads as real, not instant and suspicious.
    setTimeout(() => {
      commit({ ...handles, [id]: value });
      setEditing(null);
      setBusy(null);
    }, 500);
  };

  const disconnect = (id: AppId) => {
    const next = { ...handles };
    delete next[id];
    commit(next);
  };

  return (
    <section className="rounded-xl border border-ink/15 bg-paper p-5">
      <h2 className="font-display text-xl">Connect your other apps</h2>
      <p className="mt-1 text-inkSoft">
        Pulls in taste you&rsquo;ve already built elsewhere, instead of typing it twice.
      </p>

      <ul className="mt-4 space-y-3">
        {APPS.map((app) => {
          const handle = handles[app.id];
          const connected = Boolean(handle);
          const isEditing = editing === app.id;
          const isBusy = busy === app.id;

          return (
            <li key={app.id} className="rounded-lg border border-ink/15 px-3 py-3">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-paper"
                  style={{ background: app.color }}
                >
                  <app.Icon className="h-5 w-5" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="font-display leading-tight">{app.name}</p>
                  <p className="truncate text-sm text-inkSoft">
                    {connected ? `Connected as @${handle}` : app.blurb}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    isEditing ? submit(app.id) : connected ? disconnect(app.id) : open(app.id)
                  }
                  disabled={busy !== null}
                  className={`w-[6.75rem] shrink-0 rounded-md border px-3 py-1.5 text-center text-sm disabled:opacity-60 ${
                    connected
                      ? "border-ink/25 text-inkSoft hover:border-ink/40 hover:text-ink"
                      : "border-ink bg-ink text-paper"
                  }`}
                >
                  {isBusy ? "…" : connected ? "Disconnect" : "Connect"}
                </button>
              </div>

              {isEditing && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submit(app.id);
                  }}
                  className="mt-3"
                >
                  <div className="flex gap-2">
                    <label className="flex min-w-0 flex-1 items-center rounded-md border border-ink/25 bg-paper focus-within:border-ink">
                      <span aria-hidden className="pl-3 text-inkSoft">
                        @
                      </span>
                      <input
                        value={draft}
                        onChange={(e) => {
                          setDraft(e.target.value);
                          if (error) setError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") cancel();
                        }}
                        placeholder={app.placeholder}
                        aria-label={`${app.name} username`}
                        aria-invalid={Boolean(error)}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        autoFocus
                        className="min-w-0 flex-1 bg-transparent py-2 pr-3 pl-1 outline-none"
                      />
                    </label>
                  </div>
                  <div className="mt-2 flex items-start justify-between gap-3">
                    {error ? (
                      <p role="alert" className="text-sm text-string">
                        {error}
                      </p>
                    ) : (
                      <span />
                    )}
                    <button
                      type="button"
                      onClick={cancel}
                      disabled={busy !== null}
                      className="shrink-0 text-sm text-inkSoft underline disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.59 14.44a.62.62 0 0 1-.86.21c-2.36-1.44-5.33-1.77-8.84-.97a.62.62 0 1 1-.28-1.22c3.84-.88 7.14-.5 9.77 1.11.3.18.4.57.21.87Zm1.22-2.72a.78.78 0 0 1-1.07.26c-2.7-1.66-6.82-2.14-10.02-1.17a.78.78 0 1 1-.45-1.49c3.65-1.1 8.19-.57 11.28 1.33.37.23.48.72.26 1.07Zm.11-2.83c-3.24-1.92-8.6-2.1-11.7-1.16a.93.93 0 1 1-.54-1.78c3.56-1.08 9.46-.87 13.19 1.34a.93.93 0 0 1-.95 1.6Z" />
    </svg>
  );
}

function BeliIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path d="M7 3v8a2 2 0 0 0 4 0V3" strokeLinecap="round" />
      <path d="M9 11v10" strokeLinecap="round" />
      <path d="M16 3c-1.5 1.5-1.5 6 0 8s0 6.5 0 10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}