/**
 * Prints what the Explore feed will say, without starting the app.
 *
 * Run it after you change anything in src/data/world.ts — especially edge
 * weights. It's the fastest way to see whether you broke the reveal.
 *
 *   npm run verify
 */
import { buildIndex } from "../src/lib/graph/core";
import { discoverPeople, findStrands, sharedUpcoming } from "../src/lib/graph/strings";
import { describeStrand } from "../src/lib/graph/describe";
import { CURRENT_USER_KEY, edges, nodes } from "../src/data/world";

const g = buildIndex(nodes, edges);
const me = CURRENT_USER_KEY;

console.log(`\nExplore feed for ${g.nodes.get(me)?.name}\n`);
for (const b of discoverPeople(g, me, { limit: 5 })) {
  console.log(
    `${b.target.name.padEnd(8)} score ${b.score.toFixed(2)}  ${b.strands.length} strings`,
  );
  for (const s of b.strands) console.log(`    · ${describeStrand(s)}`);
  const soon = sharedUpcoming(g, me, b.target.id);
  if (soon.length) console.log(`    → both going to ${soon.map((e) => e.name).join(", ")}`);
  console.log();
}

const [target] = process.argv.slice(2);
if (target) {
  console.log(`Every string to "${target}":`);
  for (const s of findStrands(g, me, target)) {
    console.log(`  ${s.score.toFixed(2)}  ${s.label || "direct"}`);
  }
}
