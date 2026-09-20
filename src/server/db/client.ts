import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

const globalForMongo = globalThis as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

/**
 * Undefined when MONGODB_URI isn't set, so importing this module never
 * crashes pages that don't touch the database (e.g. sign-in without an
 * adapter configured yet). Callers that need the database should call
 * requireMongoClientPromise() to get a clear error at the point of use.
 */
export const mongoClientPromise = uri
  ? globalForMongo._mongoClientPromise ?? new MongoClient(uri).connect()
  : undefined;

if (uri && process.env.NODE_ENV !== "production") {
  globalForMongo._mongoClientPromise = mongoClientPromise;
}

export function requireMongoClientPromise() {
  if (!mongoClientPromise) {
    throw new Error("MONGODB_URI is not set");
  }
  return mongoClientPromise;
}

export async function appDb() {
  const client = await requireMongoClientPromise();
  return client.db("invisible-string");
}
