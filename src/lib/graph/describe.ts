import type { Strand, StringBundle } from "./types";

/**
 * Turns a path the graph already found into a sentence.
 *
 * Deliberately not an LLM call. The phrasing is the cheap part; the paths are
 * the product. If you want a model writing this copy later, pass these same
 * facts to it and forbid it from adding anything not in them — the whole value
 * of "you and Jordan have five strings" is that every one of them is real.
 */

export function describeStrand(strand: Strand): string {
  const [me, ...rest] = strand.path;
  const them = rest[rest.length - 1];
  const vias = strand.hops.map((h) => h.via);

  if (vias.length === 0) return `You know ${them.name}.`;

  if (vias.length === 1) {
    const via = vias[0];
    switch (via.type) {
      case "PERSON":
        return `You both know ${via.name}.`;
      case "EVENT":
        return `You were both at ${via.name}.`;
      case "INTEREST":
        return `You're both into ${via.name}.`;
      case "COURSE":
        return `You're both in ${via.name}.`;
      case "PLACE":
        return `You're both at ${via.name}.`;
      default:
        return `You and ${them.name} both have ${via.name} in common.`;
    }
  }

  return `${me.name} → ${vias.map((v) => v.name).join(" → ")} → ${them.name}`;
}

export function headlineFor(bundle: StringBundle): string {
  const n = bundle.strands.length;
  if (n === 0) return `Nothing connects you to ${bundle.target.name} yet.`;
  const noun = n === 1 ? "string" : "strings";
  return `${n} ${noun} already reach ${bundle.target.name}.`;
}
