import { randomBytes } from "node:crypto";
import { getDb } from "@/server/db/client";
import { COLLECTIONS, ensureIndexes, type UserDoc } from "@/server/db/schema";

const EMPTY_PROFILE: UserDoc["profile"] = {
  interests: [],
  budget: "cheap",
  city: null,
  freeEvenings: [],
};

/** Opaque and short. Ids end up in URLs, so an email would leak one. */
const newId = () => `u_${randomBytes(6).toString("hex")}`;

export async function findById(id: string): Promise<UserDoc | null> {
  const db = await getDb();
  return db.collection<UserDoc>(COLLECTIONS.users).findOne({ _id: id });
}

export async function findManyByIds(ids: string[]): Promise<Map<string, UserDoc>> {
  if (ids.length === 0) return new Map();
  const db = await getDb();
  const docs = await db
    .collection<UserDoc>(COLLECTIONS.users)
    .find({ _id: { $in: ids } })
    .toArray();
  return new Map(docs.map((u) => [u._id, u]));
}

/**
 * Sign-in. Either this person already exists — because a friend tagged them
 * into an event months ago — and they claim that account with its history
 * intact, or they are new and we make one.
 *
 * Claiming by email is the whole reason tagged people are real users: the
 * string a friend drew to your name is waiting for you when you arrive.
 */
export async function claimOrCreate(identity: {
  email: string;
  name: string;
  avatarUrl: string | null;
}): Promise<UserDoc> {
  const db = await getDb();
  const users = db.collection<UserDoc>(COLLECTIONS.users);

  // Cheap on a warm database and the only place that needs the unique index
  // to exist, so this is where we make sure it does.
  await ensureIndexes(db).catch(() => {
    // An index that already exists, or a read-only user, must not block a
    // sign-in. The uniqueness check below is what actually matters.
  });

  const existing = await users.findOne({ email: identity.email });
  if (existing) {
    // A claimed contact usually has a placeholder name typed by whoever tagged
    // them. Their own Dropbox name and avatar are better, so take those.
    //
    // `profile` is backfilled because a row claimed here was not necessarily
    // written by this code — an earlier schema, or a half-finished experiment,
    // can leave a user with no profile at all, and every reader downstream
    // assumes one is there.
    const patch = {
      name: identity.name,
      avatarUrl: identity.avatarUrl ?? existing.avatarUrl ?? null,
      profile: existing.profile ?? EMPTY_PROFILE,
    };
    await users.updateOne({ _id: existing._id }, { $set: patch });
    return { ...existing, ...patch };
  }

  const doc: UserDoc = {
    _id: newId(),
    email: identity.email,
    name: identity.name,
    avatarUrl: identity.avatarUrl,
    profile: EMPTY_PROFILE,
  };
  await users.insertOne(doc);
  return doc;
}

/**
 * Someone you were with, created from the tag screen. A real row in `users`,
 * so they appear in strings and in the graph exactly like anyone else — they
 * simply have not signed in yet.
 *
 * With an email, an existing person is reused rather than duplicated: tagging
 * "maya@…" twice from two different events is one Maya.
 */
export async function createContact(input: {
  name: string;
  email: string | null;
}): Promise<UserDoc> {
  const db = await getDb();
  const users = db.collection<UserDoc>(COLLECTIONS.users);

  if (input.email) {
    const existing = await users.findOne({ email: input.email });
    if (existing) return existing;
  }

  const doc: UserDoc = {
    _id: newId(),
    email: input.email,
    name: input.name,
    avatarUrl: null,
    profile: EMPTY_PROFILE,
  };
  await users.insertOne(doc);
  return doc;
}

/**
 * Where a user's Dropbox connection is written after OAuth.
 *
 * Field by field rather than as a whole object: signing in again must not
 * silently reset the folder they chose, nor blank a refresh token that
 * Dropbox declined to reissue because the consent was already given.
 */
export async function setDropbox(
  userId: string,
  grant: {
    accessToken: string;
    refreshToken: string | null;
    accountId: string;
    expiresAt: string;
  },
): Promise<void> {
  const db = await getDb();
  const users = db.collection<UserDoc>(COLLECTIONS.users);

  const fields: Record<string, unknown> = {
    "dropbox.accessToken": grant.accessToken,
    "dropbox.expiresAt": grant.expiresAt,
    "dropbox.accountId": grant.accountId,
  };
  if (grant.refreshToken) fields["dropbox.refreshToken"] = grant.refreshToken;

  await users.updateOne({ _id: userId }, { $set: fields });

  // First connection: give the folder a value so "not chosen yet" is a state
  // the app can see, rather than an absent field.
  await users.updateOne(
    { _id: userId, "dropbox.folder": { $exists: false } },
    { $set: { "dropbox.folder": null } },
  );
}

/** Refreshed access tokens are written back so the next request reuses them. */
export async function setDropboxToken(
  userId: string,
  token: { accessToken: string; expiresAt: string },
): Promise<void> {
  const db = await getDb();
  await db.collection<UserDoc>(COLLECTIONS.users).updateOne(
    { _id: userId },
    { $set: { "dropbox.accessToken": token.accessToken, "dropbox.expiresAt": token.expiresAt } },
  );
}

export async function setDropboxFolder(userId: string, folder: string): Promise<void> {
  const db = await getDb();
  await db
    .collection<UserDoc>(COLLECTIONS.users)
    .updateOne({ _id: userId }, { $set: { "dropbox.folder": folder } });
}
