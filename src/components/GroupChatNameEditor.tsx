"use client";

import { useEffect, useState } from "react";
import { DEFAULT_GROUP_CHAT_NAME, getGroupChatName, setGroupChatName } from "@/lib/groupChatNames";

/**
 * Editable chat title, backed by the same localStorage entry the circle
 * page's loop labels read (see groupChatNames.ts) — renaming here is what
 * changes what shows up in the loop. Saves on blur and on Enter rather than
 * on every keystroke, so a name isn't left half-typed in storage.
 */
export default function GroupChatNameEditor({ id }: { id: string }) {
  const [name, setName] = useState(DEFAULT_GROUP_CHAT_NAME);

  useEffect(() => {
    setName(getGroupChatName(id));
  }, [id]);

  const save = () => setGroupChatName(id, name);

  return (
    <input
      value={name}
      onChange={(e) => setName(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          save();
          e.currentTarget.blur();
        }
      }}
      aria-label="Group chat name"
      placeholder={DEFAULT_GROUP_CHAT_NAME}
      className="mt-4 w-full rounded-md border border-transparent bg-transparent font-display text-3xl outline-none transition-colors hover:border-inkSoft/30 focus:border-inkSoft/60"
    />
  );
}
