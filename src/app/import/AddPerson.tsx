"use client";
import { useState } from "react";
import type { Person } from "@/app/import/ImportView";

/**
 * Adding someone you were with.
 *
 * The email is optional but it is the thing that makes the string two-sided:
 * when that person signs in with it they claim this account and find the
 * history already there, rather than starting from nothing.
 */
export default function AddPerson({ onAdded }: { onAdded: (person: Person) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() || undefined }),
      });
      const data = (await res.json()) as { person?: Person; error?: string };
      if (!res.ok || !data.person) throw new Error(data.error ?? "Could not add them");
      onAdded(data.person);
      setName("");
      setEmail("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add them");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-dashed border-ink/30 px-3 py-1 text-sm text-inkSoft"
      >
        + Someone new
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-1 w-full rounded-md border border-ink/15 p-3">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Their name"
        aria-label="Their name"
        className="w-full rounded-md border border-ink/20 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-string"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Their email (optional — lets them claim this later)"
        aria-label="Their email"
        className="mt-2 w-full rounded-md border border-ink/20 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-string"
      />
      <div className="mt-2 flex gap-2">
        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="rounded-md bg-string px-3 py-1.5 text-sm text-paper disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-2 text-sm text-inkSoft underline"
        >
          Cancel
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-string">{error}</p>}
    </form>
  );
}
