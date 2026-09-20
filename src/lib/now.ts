/**
 * `?now=2026-12-31` — the two lines that turn "decay happens" into a thing you
 * can show on stage. Every read path takes `now` as an argument, so this is
 * the only place the real clock is consulted.
 */
export function parseNow(value: string | null | undefined): Date {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}
