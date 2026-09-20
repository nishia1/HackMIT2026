"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ExportHighlightsButton from "@/components/ExportHighlightsButton";
import GroupChatSetup from "@/components/GroupChatSetup";
import GroupGraph from "@/components/GroupGraph";
import {
  demoUsernames,
  getGroupChatMembers,
  setGroupChatMembers,
  type GroupChatMember,
} from "@/lib/groupChatMembers";
import {
  DEFAULT_GROUP_CHAT_NAME,
  getGroupChatName,
  setGroupChatName,
} from "@/lib/groupChatNames";

/** Your own node in the graph, always first so the layout puts you at the bottom. */
const YOU: GroupChatMember = { username: "you", name: "YOU" };

/**
 * A group chat is either still being set up — no members saved for this id —
 * or it's the graph. Both live behind the same URL, so tapping "NEW GROUP
 * CHAT" on the circle page asks who's in it first and lands on the graph
 * after. Storage is client-only (see groupChatMembers.ts), so which one to
 * show is decided after mount, not during render.
 */
export default function GroupChatView({ id }: { id: string }) {
  const router = useRouter();
  const [members, setMembers] = useState<GroupChatMember[] | null>(null);
  const [name, setName] = useState(DEFAULT_GROUP_CHAT_NAME);
  const [editing, setEditing] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setMembers(getGroupChatMembers(id));
    setName(getGroupChatName(id));
    setReady(true);
  }, [id]);

  const save = (nextName: string, nextMembers: GroupChatMember[]) => {
    setGroupChatName(id, nextName);
    setGroupChatMembers(id, nextMembers);
    setName(nextName);
    setMembers(nextMembers);
    setEditing(false);
  };

  if (!ready) return null;

  if (!members || editing) {
    return (
      <GroupChatSetup
        initialName={name === DEFAULT_GROUP_CHAT_NAME ? "" : name}
        initialUsernames={members ? members.map((m) => m.username) : demoUsernames(id)}
        onDone={save}
      />
    );
  }

  return (
    <div className="pt-6">
      <div className="flex items-center justify-between">
        <Link href="/circle" className="text-inkSoft underline">
          &larr; Back to your circle
        </Link>
        <button onClick={() => setEditing(true)} className="text-inkSoft underline">
          Edit group
        </button>
      </div>
      {/*
        The graph is full-bleed: it breaks out of the page's narrow column
        so it gets the whole screen width, which is what makes it tall
        enough to scroll on a phone rather than being squeezed into one
        screenful.
      */}
      <div className="relative left-1/2 mt-4 w-screen -translate-x-1/2">
        <GroupGraph
          name={name === DEFAULT_GROUP_CHAT_NAME ? "GROUP NAME" : name.toUpperCase()}
          members={[YOU, ...members]}
          footer={
            <ExportHighlightsButton onClick={() => router.push(`/group-chat/${id}/highlights`)} />
          }
        />
      </div>
    </div>
  );
}
