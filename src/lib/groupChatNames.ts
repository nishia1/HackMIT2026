/**
 * Group chat names are per-chat, user-editable, and otherwise unbacked by
 * anything server-side, so they're persisted client-side in localStorage
 * keyed by the chat id (the same `main-${index}-${i}` id used in its URL).
 * Both the circle page's labels and the chat page's editable title read and
 * write through here so they stay in sync.
 */
export const DEFAULT_GROUP_CHAT_NAME = "NEW GROUP CHAT";

function storageKey(id: string): string {
  return `group-chat-name:${id}`;
}

export function getGroupChatName(id: string): string {
  if (typeof window === "undefined") return DEFAULT_GROUP_CHAT_NAME;
  return window.localStorage.getItem(storageKey(id)) || DEFAULT_GROUP_CHAT_NAME;
}

export function setGroupChatName(id: string, name: string): void {
  if (typeof window === "undefined") return;
  const trimmed = name.trim();
  if (!trimmed || trimmed === DEFAULT_GROUP_CHAT_NAME) {
    window.localStorage.removeItem(storageKey(id));
  } else {
    window.localStorage.setItem(storageKey(id), trimmed);
  }
}
