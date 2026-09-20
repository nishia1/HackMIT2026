import { getDb } from "@/server/db/client";
import { COLLECTIONS, type UserDoc } from "@/server/db/schema";
import { demoWorld } from "./memory-store";

export async function findById(id: string): Promise<UserDoc | null> {
  const db = await getDb();
  if (!db) return demoWorld().users.find((u) => u._id === id) ?? null;
  return db.collection<UserDoc>(COLLECTIONS.users).findOne({ _id: id });
}

export async function findManyByIds(ids: string[]): Promise<Map<string, UserDoc>> {
  if (ids.length === 0) return new Map();
  const db = await getDb();
  const docs = db
    ? await db
        .collection<UserDoc>(COLLECTIONS.users)
        .find({ _id: { $in: ids } })
        .toArray()
    : demoWorld().users.filter((u) => ids.includes(u._id));
  return new Map(docs.map((u) => [u._id, u]));
}

export async function findAll(): Promise<UserDoc[]> {
  const db = await getDb();
  if (!db) return demoWorld().users;
  return db.collection<UserDoc>(COLLECTIONS.users).find({}).toArray();
}
