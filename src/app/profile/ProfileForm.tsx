"use client";
import { useEffect, useState } from "react";
import type { Budget, Profile } from "@/lib/types";

/**
 * Everything the planner matches against, on one screen.
 *
 * Kept to four questions because nobody fills in a fifth. Budget is a radio
 * rather than a number on purpose — "under $15 each" is a thing people can
 * answer honestly about themselves, and the matcher only ever compares the two
 * and takes the lower one.
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

const EMPTY: Profile = { interests: [], budget: "cheap", city: null, freeEvenings: [] };

export default function ProfileForm() {
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "saved" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((p: Profile) => {
        setProfile({ ...EMPTY, ...p });
        setStatus("idle");
      })
      .catch(() => setStatus("error"));
  }, []);

  const patch = (next: Partial<Profile>) => {
    setProfile((p) => ({ ...p, ...next }));
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

  const save = async () => {
    setStatus("saving");
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "could not save");
      setStatus("saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not save");
      setStatus("error");
    }
  };

  if (status === "loading") return <p className="pt-8 text-inkSoft">Loading&hellip;</p>;

  return (
    <div className="space-y-8 pt-8">
      <header>
        <h1 className="font-display text-3xl">Your profile</h1>
        <p className="mt-2 text-inkSoft">
          Used to suggest things you and a friend would both actually say yes to.
        </p>
      </header>

      <section>
        <h2 className="font-display text-xl">What you&rsquo;re into</h2>
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

      <section>
        <h2 className="font-display text-xl">What you can spend</h2>
        <p className="text-inkSoft">We always use the lower of the two budgets.</p>
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

      <section>
        <h2 className="font-display text-xl">Where you are</h2>
        <input
          value={profile.city ?? ""}
          onChange={(e) => patch({ city: e.target.value || null })}
          placeholder="Cambridge"
          aria-label="City"
          className="mt-3 w-full rounded-md border border-ink/25 bg-paper px-3 py-2"
        />
        <p className="mt-2 text-sm text-inkSoft">
          Friends in another city get plans that work over a call.
        </p>
      </section>

      <section>
        <h2 className="font-display text-xl">Usually free</h2>
        <div className="mt-3 flex gap-2">
          {DAYS.map((label, day) => {
            const on = profile.freeEvenings.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() =>
                  patch({
                    freeEvenings: on
                      ? profile.freeEvenings.filter((d) => d !== day)
                      : [...profile.freeEvenings, day],
                  })
                }
                aria-pressed={on}
                aria-label={DAY_NAMES[day]}
                className={`h-11 w-11 rounded-full border font-display ${
                  on ? "border-ink bg-ink text-paper" : "border-ink/25 text-inkSoft"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      <div className="sticky bottom-24 pt-2">
        <button
          type="button"
          onClick={save}
          disabled={status === "saving"}
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
