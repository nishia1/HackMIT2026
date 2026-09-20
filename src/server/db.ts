import { MongoClient, type Db } from "mongodb";

/**
 * One client for the whole process. Next's dev server reloads modules on every
 * edit, so the client is parked on `globalThis` — without that you leak a
 * connection pool per save and Atlas starts refusing you halfway through a
 * hackathon.
 */

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "invisible-string";

declare global {
  // eslint-disable-next-line no-var
  var _mongo: Promise<MongoClient> | undefined;
}

export function isConfigured(): boolean {
  return Boolean(uri);
}

export async function db(): Promise<Db> {
  if (!uri) {
    throw new Error("MONGODB_URI is not set — add it to .env.local");
  }
  global._mongo ??= new MongoClient(uri).connect();
  return (await global._mongo).db(dbName);
}
