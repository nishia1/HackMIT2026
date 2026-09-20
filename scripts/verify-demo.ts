/**
 * Asserts that thick + grey works, without starting the app or the database.
 *
 *   npm run verify
 *
 * Everything here runs against the same seeded world the app serves, through
 * the same pure domain functions, at a fixed `now`. Run it after touching
 * strength.ts, tiers.ts or the seed — it's the fastest way to find out
 * whether you broke the demo.
 */
import { buildWorld, ME } from "../src/server/db/demo-world";
import { strengthOf } from "../src/server/domain/strength";
import { deservesNudge, losing, strokeFor, tierOf } from "../src/server/domain/tiers";
import { adjacencyOf, discover } from "../src/server/domain/discover";
import type { EventDoc } from "../src/lib/types";

const NOW = new Date("2026-06-01T00:00:00.000Z");
const world = buildWorld(NOW);

const names = new Map(world.users.map((u) => [u._id, u.name]));

const buckets = new Map<string, EventDoc[]>();
for (const event of world.events) {
  if (!event.attendeeIds.includes(ME)) continue;
  for (const id of event.attendeeIds) {
    if (id === ME || !names.has(id)) continue;
    buckets.set(id, [...(buckets.get(id) ?? []), event]);
  }
}

const strings = [...buckets]
  .map(([personId, events]) => {
    const s = strengthOf(events, NOW);
    return { personId, name: names.get(personId)!, ...s, tier: tierOf(s.warmth) };
  })
  .sort((a, b) => b.depth - a.depth);

console.log(`\nStrings for ${names.get(ME)} at ${NOW.toISOString().slice(0, 10)}\n`);
for (const s of strings) {
  console.log(
    `${s.name.padEnd(8)} depth ${s.depth.toFixed(1).padStart(5)}  stroke ${strokeFor(s.depth).toFixed(1)}  warmth ${s.warmth.toFixed(2)}  ${s.tier.padEnd(7)} ${s.eventCount} events`,
  );
}

const nudges = strings
  .filter((s) => deservesNudge(s.tier, s.depth))
  .sort((a, b) => losing(b.depth, b.warmth) - losing(a.depth, a.warmth));

console.log("\nNudges, worst first");
for (const n of nudges) {
  console.log(`  ${n.name.padEnd(8)} losing ${losing(n.depth, n.warmth).toFixed(1)}`);
}

console.log("\nDiscover, three and four hops out");
const found = discover(adjacencyOf(world.friendships.map((f) => f.pair)), ME);
for (const d of found) {
  console.log(
    `  ${(names.get(d.personId) ?? d.personId).padEnd(8)} ${d.degree} hops, ${d.pathCount} chains via ${d.via.map((id) => names.get(id) ?? id).join(" → ")}`,
  );
}

// ——— the assertions the demo actually depends on ———

const failures: string[] = [];
const check = (label: string, ok: boolean) => {
  if (!ok) failures.push(label);
};

const maya = strings.find((s) => s.personId === "maya")!;
const jordan = strings.find((s) => s.personId === "jordan")!;

check("maya has a year of history", maya.eventCount >= 14);
check("maya's string is thick", strokeFor(maya.depth) > 5.5);
check("maya's string has gone grey", maya.warmth < 0.1);
check("jordan's string is alive", jordan.tier === "alive");
check("jordan's string is thinner than maya's", jordan.depth < maya.depth);
check("the top nudge is maya", nudges[0]?.personId === "maya");
check("nobody you've met shows up in discover", found.every((d) => d.degree >= 3));
check("discover found someone", found.length > 0);

// Time travel has to visibly change the picture, or the demo is a claim.
const later = strengthOf(buckets.get("jordan")!, new Date("2026-12-31T00:00:00.000Z"));
check("jordan fades by year end", tierOf(later.warmth) !== "alive");

console.log();
if (failures.length) {
  for (const f of failures) console.error(`FAIL  ${f}`);
  process.exit(1);
}
console.log("ok — thick and grey works");
