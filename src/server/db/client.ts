import { MongoClient, type Db } from "mongodb";

/**
 * One connection for the whole process, cached across hot reloads in dev
 * because Next re-evaluates modules on every edit and Atlas M0 allows 500
 * connections, not 5,000.
 *
 * Two different callers need this in two different shapes:
 *  - @auth/mongodb-adapter wants a raw Promise<MongoClient> (mongoClientPromise).
 *  - The repo layer wants a resolved Db, or null if no MONGODB_URI is set,
 *    so `npm run dev` still works on a fresh clone against the seeded demo
 *    world in memory.
 * Both share the same cached connection below rather than opening two.
 */

const globalForMongo = globalThis as typeof globalThis & {
  __mongo?: Promise<MongoClient>;
};

export function isDbConfigured() {
  return Boolean(process.env.MONGODB_URI);
}

function connect(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }

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

  return globalForMongo.__mongo;
}

/**
 * Undefined when MONGODB_URI isn't set, so importing this module never
 * crashes pages that don't touch the database (e.g. sign-in without an
 * adapter configured yet). Callers that need the database should call
 * requireMongoClientPromise() to get a clear error at the point of use.
 * This is the shape @auth/mongodb-adapter expects for its clientPromise option.
 */
export const mongoClientPromise = isDbConfigured() ? connect() : undefined;

export function requireMongoClientPromise() {
  if (!mongoClientPromise) {
    throw new Error("MONGODB_URI is not set");
  }
  return mongoClientPromise;
}

export async function getDb(): Promise<Db | null> {
  if (!isDbConfigured()) return null;
  const client = await connect();
  return client.db(process.env.MONGODB_DB ?? "invisible-string");
}

/** Back-compat alias for callers still using the old name. */
export async function appDb() {
  const client = await requireMongoClientPromise();
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