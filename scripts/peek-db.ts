/**
 * Quick look at what's actually in Mongo. Read-only, prints and exits.
 * Run: npx tsx --env-file=.env.local scripts/peek-db.ts
 */
import { MongoClient } from "mongodb";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set (check .env.local)");

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("invisible-string");

  for (const name of ["users", "accounts", "sessions"]) {
    const docs = await db.collection(name).find({}).limit(20).toArray();
    console.log(`\n— ${name} (${docs.length}) —`);
    for (const d of docs) {
      // Redact tokens; we only care whether the row exists and who it's for.
      const { access_token, refresh_token, ...rest } = d as Record<string, unknown>;
      console.log(rest);
    }
  }

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
