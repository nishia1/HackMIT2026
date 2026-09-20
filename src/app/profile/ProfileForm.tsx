"use client";
import { useEffect, useState } from "react";
import type { Budget, FreeWindow, Profile } from "@/lib/types";
import ConnectedApps from "./ConnectedApps";

/**
 * Everything the planner matches against, on one screen.
 *
 * Kept to four questions because nobody fills in a fifth. Budget is a radio
 * rather than a number on purpose — "under $15 each" is a thing people can
 * answer honestly about themselves, and the matcher only ever compares the two
 * and takes the lower one.
 *
 * Availability is stored per day: each picked day carries its own from/to
 * window, so "Tue 18:00–22:00, Sat 10:00–23:00" is expressible.
 */

const BUDGETS: { value: Budget; label: string; hint: string }[] = [
  { value: "free", label: "Free", hint: "nothing at all" },
  { value: "cheap", label: "Cheap", hint: "under $15" },
  { value: "mid", label: "Mid", hint: "under $40" },
  { value: "splurge", label: "Splurge", hint: "no limit" },
];

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const SUGGESTIONS = [
  "ramen", "coffee", "bouldering", "live music", "hiking", "board games",
  "film photography", "pottery", "running", "museums", "cooking", "karaoke",
];

/** What a day gets when you first tap it. Editable per day afterwards. */
const DEFAULT_WINDOW = { from: "18:00", to: "22:00" };

const EMPTY: Profile = {
  interests: [],
  budget: "cheap",
  city: null,
  freeWindows: [],
  connectedApps: {},
};

/** A hardcoded shortlist beats a free-text city typo the geocoder sends to
 * the wrong country. "Other" drops back to typing it in. */
const CITIES = [
  "Cambridge, MA",
  "Boston, MA",
  "Atlanta, GA",
  "Seattle, WA",
  "New York, NY",
  "San Francisco, CA",
  "Austin, TX",
  "Chicago, IL",
];
const OTHER = "__other__";

/** Shape of a profile saved before per-day windows existed. */
type LegacyProfile = Partial<Profile> & {
  freeEvenings?: number[];
  freeFrom?: string;
  freeTo?: string;
};

export default function ProfileForm() {
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "saved" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [paste, setPaste] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [cityOther, setCityOther] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((p: LegacyProfile) => {
        // Migrate old profiles: one shared window applied to every picked day.
        const freeWindows: FreeWindow[] =
          p.freeWindows ??
          (p.freeEvenings ?? []).map((day) => ({
            day,
            from: p.freeFrom ?? DEFAULT_WINDOW.from,
            to: p.freeTo ?? DEFAULT_WINDOW.to,
          }));
        const next: Profile = {
          ...EMPTY,
          ...p,
          freeWindows,
          connectedApps: p.connectedApps ?? {},
        };
        setProfile(next);
        setCityOther(Boolean(next.city && !CITIES.includes(next.city)));
        setStatus("idle");
      })
      .catch(() => setStatus("error"));
  }, []);

  const patch = (next: Partial<Profile>) => {
    setProfile((p) => ({ ...p, ...next }));
    setDirty(true);
    setStatus("idle");
  };

  const addInterest = (raw: string) => {
    const value = raw.trim();
    if (!value) {
      setError("Type something first.");
      return;
    }
    if (profile.interests.some((i) => i.toLowerCase() === value.toLowerCase())) {
      setDraft("");
      return;
    }
    setError(null);
    patch({ interests: [...profile.interests, value] });
    setDraft("");
  };

  const toggleDay = (day: number) => {
    const has = profile.freeWindows.some((w) => w.day === day);
    patch({
      freeWindows: has
        ? profile.freeWindows.filter((w) => w.day !== day)
        : [...profile.freeWindows, { day, ...DEFAULT_WINDOW }],
    });
  };

  const updateWindow = (day: number, change: Partial<Pick<FreeWindow, "from" | "to">>) => {
    patch({
      freeWindows: profile.freeWindows.map((w) => (w.day === day ? { ...w, ...change } : w)),
    });
  };

  const sortedWindows = [...profile.freeWindows].sort((a, b) => a.day - b.day);
  const badWindow = sortedWindows.some((w) => w.to <= w.from);

  /** Merges what the model found into the chips, deduped. Nothing is saved yet. */
  const extract = async () => {
    if (!paste.trim()) {
      setPasteError("Paste something first.");
      return;
    }
    setExtracting(true);
    setPasteError(null);
    try {
      const res = await fetch("/api/profile/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: paste }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "couldn't read that");

      const found: string[] = json.interests ?? [];
      if (found.length === 0) {
        setPasteError("Nothing obvious in there. Try adding a few by hand.");
        return;
      }
      setProfile((p) => {
        const have = new Set(p.interests.map((i) => i.toLowerCase()));
        return { ...p, interests: [...p.interests, ...found.filter((f) => !have.has(f.toLowerCase()))] };
      });
      setPaste("");
      setDirty(true);
      setStatus("idle");
    } catch (e) {
      setPasteError(e instanceof Error ? e.message : "couldn't read that");
    } finally {
      setExtracting(false);
    }
  };

  const save = async () => {
    setStatus("saving");
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...profile, freeWindows: sortedWindows }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "could not save");
      setDirty(false);
      setStatus("saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not save");
      setStatus("error");
    }
  };

  if (status === "loading") return <p className="pt-8 text-inkSoft">Loading&hellip;</p>;

  return (
    <div className="space-y-6 pt-8">
      <header>
        <h1 className="font-display text-3xl">Your profile</h1>
        <p className="mt-2 text-inkSoft">
          Used to suggest things you and a friend would both actually say yes to.
        </p>
      </header>

      <ConnectedApps
        initial={profile.connectedApps}
        onChange={(connectedApps) => patch({ connectedApps })}
      />

      <section className="rounded-xl border border-ink/15 bg-paper p-5">
        <h2 className="font-display text-xl">What you&rsquo;re into</h2>
        <p className="mt-1 text-inkSoft">Tap a chip to drop it. Add your own, or pick a suggestion.</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {profile.interests.map((interest) => (
            <li key={interest}>
              <button
                type="button"
                onClick={() =>
                  patch({ interests: profile.interests.filter((i) => i !== interest) })
                }
                className="rounded-full border border-ink/30 bg-paperDeep/50 px-3 py-1"
              >
                {interest} <span aria-hidden className="text-inkSoft">×</span>
                <span className="sr-only">Remove {interest}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex gap-2">
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addInterest(draft);
              }
            }}
            placeholder="add your own"
            aria-label="Add an interest"
            className="flex-1 rounded-md border border-ink/25 bg-paper px-3 py-2"
          />
          <button
            type="button"
            onClick={() => addInterest(draft)}
            className="rounded-md bg-ink px-4 py-2 text-paper"
          >
            Add
          </button>
        </div>
        {error && status !== "error" && <p className="mt-2 text-sm text-string">{error}</p>}

        <ul className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.filter(
            (s) => !profile.interests.some((i) => i.toLowerCase() === s),
          ).map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => addInterest(s)}
                className="rounded-full border border-dashed border-ink/25 px-3 py-1 text-inkSoft"
              >
                + {s}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-ink/15 bg-paper p-5">
        <h2 className="font-display text-xl">Or paste anything</h2>
        <p className="mt-1 text-inkSoft">
          Your Beli list, your Letterboxd diary, a playlist, your bio. We&rsquo;ll pull the
          interests out and you can keep the ones that are right.
        </p>
        <textarea
          value={paste}
          onChange={(e) => {
            setPaste(e.target.value);
            if (pasteError) setPasteError(null);
          }}
          rows={4}
          placeholder="paste here"
          aria-label="Paste text to extract interests from"
          className="mt-3 w-full resize-y rounded-md border border-ink/25 bg-paper px-3 py-2"
        />
        {pasteError && <p className="mt-2 text-sm text-string">{pasteError}</p>}
        <button
          type="button"
          onClick={extract}
          disabled={extracting}
          className="mt-2 w-full rounded-md border border-ink/30 px-4 py-2 disabled:opacity-60"
        >
          {extracting ? "Reading…" : "Read it"}
        </button>
      </section>

      <section className="rounded-xl border border-ink/15 bg-paper p-5">
        <h2 className="font-display text-xl">What you can spend</h2>
        <p className="mt-1 text-inkSoft">We always use the lower of the two budgets.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {BUDGETS.map((b) => (
            <button
              key={b.value}
              type="button"
              onClick={() => patch({ budget: b.value })}
              aria-pressed={profile.budget === b.value}
              className={`rounded-lg border p-3 text-left ${
                profile.budget === b.value
                  ? "border-ink bg-stamp/25"
                  : "border-ink/20 bg-paper"
              }`}
            >
              <span className="block font-display">{b.label}</span>
              <span className="block text-sm text-inkSoft">{b.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-ink/15 bg-paper p-5">
        <h2 className="font-display text-xl">Where you are</h2>
        <p className="mt-1 text-inkSoft">
          A shortlist, so the geocoder doesn&rsquo;t send a typo to the wrong country.
          Friends in another city get plans that work over a call.
        </p>
        <label className="mt-3 block">
          <span className="sr-only">City</span>
          <select
            value={cityOther ? OTHER : (profile.city ?? "")}
            onChange={(e) => {
              const v = e.target.value;
              if (v === OTHER) {
                setCityOther(true);
                if (!profile.city || CITIES.includes(profile.city)) patch({ city: null });
                return;
              }
              setCityOther(false);
              patch({ city: v || null });
            }}
            className="w-full rounded-md border border-ink/25 bg-paper px-3 py-2"
          >
            <option value="">Pick a city</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value={OTHER}>Other&hellip;</option>
          </select>
        </label>
        {cityOther && (
          <input
            value={profile.city ?? ""}
            onChange={(e) => patch({ city: e.target.value || null })}
            placeholder="City, State or country"
            aria-label="Custom city"
            className="mt-2 w-full rounded-md border border-ink/25 bg-paper px-3 py-2"
          />
        )}
      </section>

      <section className="rounded-xl border border-ink/15 bg-paper p-5">
        <h2 className="font-display text-xl">Usually free</h2>
        <p className="mt-1 text-inkSoft">Pick your days, then set hours for each one.</p>

        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {DAYS.map((label, day) => {
            const on = profile.freeWindows.some((w) => w.day === day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                aria-pressed={on}
                aria-label={DAY_NAMES[day]}
                className={`flex aspect-square w-full items-center justify-center rounded-full border font-display ${
                  on ? "border-ink bg-ink text-paper" : "border-ink/25 text-inkSoft"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {sortedWindows.length > 0 && (
          <ul className="mt-4 space-y-2">
            {sortedWindows.map((w) => {
              const invalid = w.to <= w.from;
              return (
                <li key={w.day}>
                  <div className="flex items-center gap-2">
                    <span className="w-12 shrink-0 font-display">
                      {DAY_NAMES[w.day].slice(0, 3)}
                    </span>
                    <input
                      type="time"
                      value={w.from}
                      onChange={(e) =>
                        updateWindow(w.day, {
                          from: (e.target.value || DEFAULT_WINDOW.from).slice(0, 5),
                        })
                      }
                      aria-label={`${DAY_NAMES[w.day]} from`}
                      className="min-w-0 flex-1 rounded-md border border-ink/25 bg-paper px-2 py-2"
                    />
                    <span className="text-inkSoft">–</span>
                    <input
                      type="time"
                      value={w.to}
                      onChange={(e) =>
                        updateWindow(w.day, {
                          to: (e.target.value || DEFAULT_WINDOW.to).slice(0, 5),
                        })
                      }
                      aria-label={`${DAY_NAMES[w.day]} to`}
                      className="min-w-0 flex-1 rounded-md border border-ink/25 bg-paper px-2 py-2"
                    />
                    <button
                      type="button"
                      onClick={() => toggleDay(w.day)}
                      aria-label={`Remove ${DAY_NAMES[w.day]}`}
                      className="px-1 text-inkSoft"
                    >
                      ×
                    </button>
                  </div>
                  {invalid && (
                    <p className="mt-1 pl-14 text-sm text-string">
                      End time needs to be after start.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="pt-2 pb-24">
        <button
          type="button"
          onClick={save}
          disabled={status === "saving" || badWindow}
          className="w-full rounded-md bg-string px-4 py-3 text-paper disabled:opacity-60"
        >
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Save profile"}
        </button>
        {status === "error" && error && (
          <p className="mt-2 text-sm text-string">{error}</p>
        )}
      </div>
    </div>
  );
}