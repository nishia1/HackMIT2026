/**
 * Proves the Google Calendar chain end to end, without waiting for Dev 2's
 * auth flow to exist.
 *
 *   1. developers.google.com/oauthplayground
 *   2. Gear → "Use your own OAuth credentials" (add the playground URL as an
 *      authorized redirect URI on your client first, or step 3 fails)
 *   3. Calendar API v3 → calendar.readonly → Authorize → Exchange for tokens
 *   4. Put the access token in .env.local as GOOGLE_TEST_ACCESS_TOKEN
 *   5. npm run check:calendar
 *
 * The token expires in an hour. That's fine — this only exists to confirm the
 * project is configured before the real flow lands.
 */
import { fetchBusy } from "../src/server/external/calendar";
import { findSlots } from "../src/server/domain/availability";

const DAY = 86_400_000;

async function main() {
  const accessToken = process.env.GOOGLE_TEST_ACCESS_TOKEN;
  const now = new Date();

  console.log("\n— availability maths, no network —");

  // Dinner tomorrow 7–9pm, drinks the day after 6–8pm. Both should visibly
  // eat into the evening window rather than being ignored.
  const evening = (daysAhead: number, fromHour: number, toHour: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysAhead);
    const start = new Date(d);
    start.setHours(fromHour, 0, 0, 0);
    const end = new Date(d);
    end.setHours(toHour, 0, 0, 0);
    return { start: start.toISOString(), end: end.toISOString() };
  };

  console.log(" no conflicts:");
  for (const slot of findSlots({ now, freeEvenings: [], limit: 2 })) {
    console.log(`  ${slot.label}${slot.confident ? "" : "  (profile only)"}`);
  }

  console.log(" same days, with two calendar conflicts:");
  for (const slot of findSlots({
    now,
    freeEvenings: [],
    busyA: [evening(1, 19, 21)],
    busyB: [evening(2, 18, 20)],
    limit: 2,
  })) {
    console.log(`  ${slot.label}`);
  }

  if (!accessToken) {
    console.log("\nNo GOOGLE_TEST_ACCESS_TOKEN set, so the live call was skipped.");
    console.log("Grab one from the OAuth playground and put it in .env.local.\n");
    return;
  }

  console.log("\n— live freeBusy —");
  const busy = await fetchBusy({
    accessToken,
    timeMin: now,
    timeMax: new Date(now.getTime() + 14 * DAY),
  });

  if (busy === null) {
    console.log(" null. Usually one of:");
    console.log("  · token expired (they last an hour)");
    console.log("  · Calendar API not enabled on this project");
    console.log("  · the token was issued without the calendar.readonly scope\n");
    process.exitCode = 1;
    return;
  }

  console.log(` ${busy.length} busy blocks in the next 14 days`);
  for (const b of busy.slice(0, 5)) console.log(`  ${b.start} → ${b.end}`);

  console.log("\n— slots, against your real calendar —");
  const slots = findSlots({ now, freeEvenings: [2, 4, 6], busyA: busy });
  if (slots.length === 0) console.log(" none free on Tue/Thu/Sat evenings — try more days");
  for (const slot of slots) console.log(` ${slot.label}`);
  console.log();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
