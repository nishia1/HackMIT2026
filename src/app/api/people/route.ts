import { NextResponse } from "next/server";
import { createContact, findManyByIds } from "@/server/repo/users";
import { friendIdsOf, link } from "@/server/repo/friends";
import { withUser } from "@/server/services/respond";

export const dynamic = "force-dynamic";

/** Everyone you can tag: the people you are already connected to. */
export async function GET() {
  return withUser(async (meId) => {
    const ids = await friendIdsOf(meId);
    const users = await findManyByIds(ids);
    return {
      people: [...users.values()].map((u) => ({
        id: u._id,
        name: u.name,
        emoji: u.avatarUrl,
      })),
    };
  });
}

/**
 * Someone new, added from the tag screen.
 *
 * They become a real user straight away rather than a label on your event —
 * that is what lets them sign in later and find the string already drawn.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    name?: string;
    email?: string;
  } | null;

  const name = body?.name?.trim();
  if (!name) return NextResponse.json({ error: "A name is required" }, { status: 400 });

  const email = body?.email?.trim().toLowerCase() || null;
  if (email && !email.includes("@")) {
    return NextResponse.json({ error: "That does not look like an email" }, { status: 400 });
  }

  return withUser(async (meId) => {
    const person = await createContact({ name, email });
    await link(meId, person._id);
    return { person: { id: person._id, name: person.name, emoji: person.avatarUrl } };
  });
}
