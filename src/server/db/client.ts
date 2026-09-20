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

  globalForMongo.__mongo ??= new MongoClient(uri, {
    // The default is 30s, which on stage reads as "the app is broken". Five
    // seconds is long enough for a healthy Atlas and short enough that a
    // blocked one tells you so while you are still looking at the screen.
    serverSelectionTimeoutMS: 5_000,
    connectTimeoutMS: 5_000,
  })
    .connect()
    // A rejected promise cached here would poison every later request, long
    // after the network recovered. Drop it so the next call retries.
    .catch((err) => {
      globalForMongo.__mongo = undefined;
      throw new Error(explain(err));
    });

  const client = await globalForMongo.__mongo;
  return client.db(process.env.MONGODB_DB ?? "invisible-string");
}

/** Turn the driver's terse network errors into the thing you actually do next. */
function explain(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);

  if (/ECONNRESET|ETIMEDOUT|ServerSelection/i.test(raw)) {
    return `Cannot reach MongoDB — is this IP allowed in Atlas → Network Access, and is the cluster running? Some networks also block port 27017. (${raw})`;
  }
  if (/Authentication failed|bad auth/i.test(raw)) {
    return `MongoDB rejected the username or password — check MONGODB_URI, and URL-encode any special characters in the password. (${raw})`;
  }
  if (/ENOTFOUND|querySrv/i.test(raw)) {
    return `Cannot resolve the MongoDB host — check the cluster address in MONGODB_URI. (${raw})`;
  }
  return raw;
}
