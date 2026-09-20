import { buildWorld, type World } from "@/server/db/demo-world";

/**
 * The world the repos read from when MONGODB_URI isn't set, so a fresh clone
 * runs. Built once per process against the moment it started, which keeps
 * ages stable inside a session.
 */

let world: World | null = null;

export function demoWorld(): World {
  world ??= buildWorld(new Date());
  return world;
}
