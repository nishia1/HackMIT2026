/**
 * The people in a group chat, persisted per chat id exactly the way its name
 * is (see groupChatNames.ts): client-side in localStorage, keyed by the
 * `main-${index}-${i}` id from the chat's URL. Nothing server-side backs a
 * group chat yet, so the setup form on the chat page is the only writer.
 *
 * Members are entered by username. Until there's a real user directory, a
 * username resolves to a display name through DEMO_DIRECTORY, falling back
 * to a name derived from the handle itself — the graph labels people by
 * name, never by username.
 */
export type GroupChatMember = {
  username: string;
  name: string;
};

/** Stand-in for the user directory: the handles the demo knows real names for. */
const DEMO_DIRECTORY: Record<string, string> = {
  alexchen: "Alex Chen",
  jordanlee: "Jordan Lee",
  sampatel: "Sam Patel",
  rileykim: "Riley Kim",
  morgandiaz: "Morgan Diaz",
  caseywong: "Casey Wong",
  taylorreyes: "Taylor Reyes",
  jamiefox: "Jamie Fox",
  drewnguyen: "Drew Nguyen",
  skylerbrooks: "Skyler Brooks",
};

const DEMO_USERNAMES = Object.keys(DEMO_DIRECTORY);

function storageKey(id: string): string {
  return `group-chat-members:${id}`;
}

export function normalizeUsername(username: string): string {
  return username.trim().replace(/^@/, "").toLowerCase();
}

/**
 * The name to show for a handle: the directory entry if we know it,
 * otherwise the handle split on its separators and title-cased, so an
 * unknown `ada.lovelace` still reads as a person rather than as a login.
 */
export function displayNameFor(username: string): string {
  const handle = normalizeUsername(username);
  const known = DEMO_DIRECTORY[handle];
  if (known) return known;
  return handle
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Returns null — not an empty array — when this chat has never been set up. */
export function getGroupChatMembers(id: string): GroupChatMember[] | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(storageKey(id));
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter((m): m is GroupChatMember => !!m && typeof m === "object" && typeof (m as GroupChatMember).username === "string")
      .map((m) => ({ username: m.username, name: m.name || displayNameFor(m.username) }));
  } catch {
    return null;
  }
}

export function setGroupChatMembers(id: string, members: GroupChatMember[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(id), JSON.stringify(members));
}

/**
 * Demo handles to prefill the setup form with, picked deterministically per
 * chat id so re-opening the same unset chat offers the same people instead
 * of reshuffling under you. Four of them, so the graph has five characters
 * counting you, as the design does.
 */
export function demoUsernames(id: string, count = 4): string[] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  const start = hash % DEMO_USERNAMES.length;
  return Array.from({ length: count }, (_, i) => DEMO_USERNAMES[(start + i) % DEMO_USERNAMES.length]);
}
