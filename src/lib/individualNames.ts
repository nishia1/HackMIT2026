/**
 * Filler names shown in "Individual" mode, standing in for the specific
 * person a loop's connection is with until that's backed by real data.
 * Assigned deterministically per loop id (a stable hash, not array order) so
 * the same loop always shows the same name across renders and reloads.
 */
const FILLER_NAMES = [
  "Alex Chen",
  "Jordan Lee",
  "Sam Patel",
  "Riley Kim",
  "Morgan Diaz",
  "Casey Wong",
  "Taylor Reyes",
  "Jamie Fox",
  "Drew Nguyen",
  "Skyler Brooks",
];

export function getIndividualName(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return FILLER_NAMES[hash % FILLER_NAMES.length];
}
