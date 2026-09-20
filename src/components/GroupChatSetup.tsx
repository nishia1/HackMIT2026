"use client";

import { useState } from "react";
import {
  displayNameFor,
  normalizeUsername,
  type GroupChatMember,
} from "@/lib/groupChatMembers";

/**
 * The prompt that stands between "NEW GROUP CHAT" on the circle page and the
 * group's graph: who's in it, and what it's called. Usernames are what you
 * type; the graph labels everyone by the name those resolve to (see
 * groupChatMembers.ts). You are always in your own group chat, so you aren't
 * listed here — the graph adds you.
 */
export default function GroupChatSetup({
  initialName,
  initialUsernames,
  onDone,
}: {
  initialName: string;
  initialUsernames: string[];
  onDone: (name: string, members: GroupChatMember[]) => void;
}) {
  const [name, setName] = useState(initialName);
  const [usernames, setUsernames] = useState(initialUsernames);

  const setAt = (i: number, value: string) =>
    setUsernames((prev) => prev.map((u, j) => (j === i ? value : u)));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const seen = new Set<string>();
    const members: GroupChatMember[] = [];
    for (const raw of usernames) {
      const username = normalizeUsername(raw);
      if (!username || seen.has(username)) continue;
      seen.add(username);
      members.push({ username, name: displayNameFor(username) });
    }
    if (members.length === 0) return;
    onDone(name.trim() || "GROUP NAME", members);
  };

  return (
    <form onSubmit={submit} className="pt-8">
      <h1 className="font-display text-3xl">New group chat</h1>
      <p className="mt-1 text-inkSoft">
        Name it, and add the people in it by username.
      </p>

      <label className="mt-6 block">
        <span className="text-sm text-inkSoft">Group chat name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="GROUP NAME"
          className="mt-1 w-full rounded-md border border-inkSoft/30 bg-white/60 px-3 py-2 outline-none focus:border-inkSoft/60"
        />
      </label>

      <fieldset className="mt-6">
        <legend className="text-sm text-inkSoft">Usernames</legend>
        <div className="mt-1 space-y-2">
          {usernames.map((username, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={username}
                onChange={(e) => setAt(i, e.target.value)}
                aria-label={`Username ${i + 1}`}
                placeholder="@username"
                className="w-full rounded-md border border-inkSoft/30 bg-white/60 px-3 py-2 outline-none focus:border-inkSoft/60"
              />
              <button
                type="button"
                onClick={() => setUsernames((prev) => prev.filter((_, j) => j !== i))}
                aria-label={`Remove username ${i + 1}`}
                className="shrink-0 rounded-md px-2 py-2 text-inkSoft hover:text-ink"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setUsernames((prev) => [...prev, ""])}
          className="mt-2 text-sm text-inkSoft underline"
        >
          + Add someone
        </button>
      </fieldset>

      <button
        type="submit"
        className="mt-8 w-full rounded-md bg-string px-4 py-3 font-display text-lg text-white"
      >
        Make the group chat
      </button>
    </form>
  );
}
