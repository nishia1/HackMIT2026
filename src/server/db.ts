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

  global._mongo ??= new MongoClient(uri, {
    // The default is 30s, which on stage reads as "the app is broken". Five
    // seconds is long enough for a healthy Atlas and short enough that a
    // blocked one tells you so while you are still looking at the screen.
    serverSelectionTimeoutMS: 5_000,
    connectTimeoutMS: 5_000,
  })
    .connect()
    // A failed promise cached on globalThis would poison every later request,
    // long after the network recovered. Drop it so the next call retries.
    .catch((err) => {
      global._mongo = undefined;
      throw new Error(explain(err));
    });

  return (await global._mongo).db(dbName);
}

/** Turn the driver's terse network errors into the thing you actually do next. */
function explain(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);

  if (/ECONNRESET|ETIMEDOUT|ServerSelection/i.test(raw)) {
    return `Cannot reach MongoDB — is this IP allowed in Atlas → Network Access, and is the cluster running? (${raw})`;
  }
  if (/Authentication failed|bad auth/i.test(raw)) {
    return `MongoDB rejected the username or password — check MONGODB_URI, and URL-encode any special characters in the password. (${raw})`;
  }
  if (/ENOTFOUND|querySrv/i.test(raw)) {
    return `Cannot resolve the MongoDB host — check the cluster address in MONGODB_URI. (${raw})`;
  }
  return raw;
}
