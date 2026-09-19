import { MongoClient, type Db } from "mongodb";

/**
 * One connection for the whole process, cached across hot reloads in dev
 * because Next re-evaluates modules on every edit and Atlas M0 allows 500
 * connections, not 5,000.
 *
 * With no MONGODB_URI set this returns null and the repo layer falls back to
 * the seeded demo world in memory, so `npm run dev` works on a fresh clone.
 */

const globalForMongo = globalThis as typeof globalThis & {
  __mongo?: Promise<MongoClient>;
};

export function isDbConfigured() {
  return Boolean(process.env.MONGODB_URI);
}

export async function getDb(): Promise<Db | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  globalForMongo.__mongo ??= new MongoClient(uri).connect();
  const client = await globalForMongo.__mongo;
  return client.db(process.env.MONGODB_DB ?? "invisible-string");
}
