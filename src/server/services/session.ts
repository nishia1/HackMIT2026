import { ME } from "@/server/db/demo-world";

/**
 * Who you're signed in as. Dev 2 owns auth; until it lands every read path
 * goes through this one function, so wiring it up is a one-line change.
 */
export function currentUserId(): string {
  return process.env.DEMO_USER_ID ?? ME;
}
