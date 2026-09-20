/**
 * GOOGLE CALENDAR, FREE/BUSY ONLY.
 *
 * `freeBusy` returns opaque busy blocks — start and end times, no titles, no
 * attendees, no locations. That's the entire reason to use it over listing
 * events: we learn when someone is free without ever reading what they're
 * doing, and the consent screen says so.
 *
 * One thing that shapes the whole feature: a token only sees calendars its own
 * user can see. You cannot read your friend's calendar with your token. So
 * pooling two people means two calls with two tokens, intersected in our own
 * code — see `domain/availability.ts`.
 *
 * Fails soft like the other adapters. No token, an expired token or a dead
 * network all mean "we don't know when they're busy", and the planner falls
 * back to the evenings on their profile.
 */

const FREEBUSY = "https://www.googleapis.com/calendar/v3/freeBusy";

export type BusyBlock = { start: string; end: string };

export function calendarAvailable(accessToken: string | null | undefined): accessToken is string {
  return Boolean(accessToken);
}

export async function fetchBusy({
  accessToken,
  timeMin,
  timeMax,
  calendarId = "primary",
}: {
  accessToken: string | null | undefined;
  timeMin: Date;
  timeMax: Date;
  calendarId?: string;
}): Promise<BusyBlock[] | null> {
  if (!calendarAvailable(accessToken)) return null;

  try {
    const res = await fetch(FREEBUSY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: [{ id: calendarId }],
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      // 401 is an expired token, 403 usually means the Calendar API isn't
      // enabled on the project. Both are "we don't know", not a crash.
      return null;
    }

    const json = (await res.json()) as {
      calendars?: Record<string, { busy?: BusyBlock[]; errors?: { reason: string }[] }>;
    };

    const cal = json.calendars?.[calendarId];
    if (!cal || cal.errors?.length) return null;
    return cal.busy ?? [];
  } catch {
    return null;
  }
}
