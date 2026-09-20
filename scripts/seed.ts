/**
 * A believable year of history, written into Mongo.
 *
 *   npm run seed
 *
 * Wrapped needs history and decay needs old events; neither can be created
 * live on stage. Without MONGODB_URI the app already serves this same world
 * from memory, so seeding is only needed once you have a real database.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MongoClient } from "mongodb";
import { buildWorld } from "../src/server/db/demo-world";
import {
  COLLECTIONS,
  ensureIndexes,
  type FriendshipDoc,
  type UserDoc,
} from "../src/server/db/schema";
import type { EventDoc } from "../src/lib/types";

async function main() {
  loadEnvLocal();

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("No MONGODB_URI. Put one in .env.local, or run the app without it:");
    console.error("the demo world is served from memory when the database is absent.");
    process.exit(1);
  }

  const world = buildWorld(new Date());
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB ?? "invisible-string");

    // Every collection is about to be emptied, and since sign-in landed those
    // collections hold real accounts and the Dropbox grants attached to them.
    // Losing a seeded world is nothing; losing those means every user
    // reconnects. So this asks to be meant.
    const users = await db.collection(COLLECTIONS.users).countDocuments();
    if (users > 0 && !process.argv.includes("--force")) {
      console.error(
        `Refusing to seed: ${users} user${users === 1 ? "" : "s"} already exist in ` +
          `"${db.databaseName}". This deletes all of them, along with their Dropbox ` +
          `connections. Re-run with --force if that is really what you want.`,
      );
      process.exit(1);
    }

    for (const name of Object.values(COLLECTIONS)) {
      await db.collection(name).deleteMany({});
    }

    await db.collection<UserDoc>(COLLECTIONS.users).insertMany(world.users);
    await db
      .collection<FriendshipDoc>(COLLECTIONS.friendships)
      .insertMany(world.friendships);
    await db.collection<EventDoc>(COLLECTIONS.events).insertMany(world.events);
    await ensureIndexes(db);

    console.log(
      `seeded ${world.users.length} users, ${world.friendships.length} friendships, ${world.events.length} events`,
    );
  } finally {
    await client.close();
  }
}

/** Two lines of dotenv, so the scripts don't need the dependency. */
function loadEnvLocal() {
  let raw: string;
  try {
    raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
