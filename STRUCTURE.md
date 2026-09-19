# Invisible String — build structure

## Overview

Every friendship is an invisible string. Every time you do something together it
gets thicker and redder; every month you don't, it fades toward grey.

Most social apps optimise for meeting new people. This one is about **not losing
the people you already have**. It reads the photos you've already taken, works
out who you were with, and shows you — as one picture — which friendships are
alive and which are quietly going cold. Then it does something about it.

## Features

| | |
| --- | --- |
| **Strings** | Thickness = how much shared history. Colour = how recent. A thick grey rope means *this mattered and you're losing it*. |
| **Memories** | Add an event with photos and a caption. Each becomes a passport stamp. |
| **Camera roll import** | Point at your Dropbox. It clusters a year of photos into events and asks who was with you. |
| **Fade and nudge** | Strings decay on a 90-day half-life. The app tells you who you're losing. |
| **Plans** | Three concrete things to do, matched to both people's interests and budget, each citing a real shared memory. |
| **Profile** | Interests, budget, city, usual free evenings — what the planner matches against. |
| **Wrapped** | Year-end scrapbook: who you saw most, what kind of things you did. |
| **Discover** | People 3–4 degrees out you haven't met. Secondary. |

## User flow

**Once:** sign in → set interests and budget → connect Dropbox → import camera
roll → tag who was in each event.

**Then, forever:** open the circle → see a string gone grey → tap the nudge →
pick one of three plans → go do it → post the photos → the string reddens.

Wrapped closes the year.

---

**10 hours · 3 devs · 1 designer.** Ownership is marked `[1]` `[2]` `[3]`.

| | Owns | Demo moment |
| --- | --- | --- |
| **Dev 1** | AI and plans — *every LLM call in the app* | "so it suggests…" → three plans |
| **Dev 2** | Photos and memories — Dropbox, stamps, Wrapped | "here's my actual camera roll" |
| **Dev 3** | The graph — strength, decay, discovery | the circle: thick red, thin grey |

Devs 2 and 3 write **plain string templates** for their copy. At hour 8 Dev 1
swaps them for AI. If Dev 1 runs late, templates ship and nothing breaks.

---

# How each part works

## Dev 3 — The Graph

> Turn the events collection into a picture of your friendships, and work out
> which ones are dying.

**The read path.** `GET /api/strings` → `services/strings.ts`:

1. `repo/events.findByAttendee(me)` — every event whose `attendeeIds` contains you.
2. Group by co-attendee. For each event, for each *other* attendee, push the
   event into that person's bucket. One pass, a `Map<personId, EventDoc[]>`.
3. Per person: `domain/strength.strengthOf(events, now)` → `{ depth, warmth }`.
4. `domain/tiers.tierOf(warmth)` → tier, stroke width, colour.
5. Return `StringView[]` sorted by `depth` descending.

No aggregation pipeline, no stored totals. At demo scale this is a few
milliseconds and it means decay is *always* correct.

**Rendering.** The circle screen draws one `<Thread>` from you to each person:

```ts
strokeWidth = 1 + 5 * Math.min(depth / 8, 1)     // 1..6
stroke      = lerp("var(--ink-soft)", "var(--string)", warmth)
```

**Discovery.** `domain/discover.ts` — BFS out from you over `friendships`,
collect everyone at depth 3 and 4, exclude depths 1 and 2 (direct friends and
obvious mutuals). Rank by how many distinct paths reach them. Cap visited at
~5,000 nodes so a dense graph can't hang the request. This is a side tab — do
not spend more than an hour on it.

**Nudge detection.** No AI. A string earns a nudge when
`tier === "fading" && depth > 0.3`, and you sort them by:

```ts
losing = depth * (1 - warmth)      // how much history × how cold it's gone
```

That ranks "old close friend you haven't seen in six months" above "acquaintance
you met once last year", which is exactly right.

**Files:** `domain/{strength,tiers,discover}.ts` · `repo/{users,friends,events}.ts` ·
`services/strings.ts` · `api/strings`, `api/strings/[id]`, `api/discover` ·
`components/{Thread,GraphCanvas,StringCard,NudgeCard}.tsx` · `app/circle`,
`app/card/[id]`, `app/discover` · `db/schema.ts` · `scripts/{seed,verify-demo}.ts`

**Done when:** the circle renders every string at the right thickness and
colour, `?now=2026-12-31` visibly fades them, and one nudge card appears naming
the person you're losing most.

---

## Dev 2 — Photos and Memories

> Get photos in — one at a time or a thousand at a time — turn them into stamps,
> and produce the year-end scrapbook.

**Manual path** (`/add-event`): title, date, pick friends, drop photos, caption.

1. `POST /api/events` → create the `EventDoc` with `attendeeIds`.
2. `POST /api/memories` per photo → `external/storage.put(file)` → Dropbox →
   returns `{ dropboxPath, tempUrl }`.
3. Call Dev 1's `labelPhotos([tempUrl])` → `{ stampTitle, emoji, kind }`.
4. Push into `event.memories[]`.

**Import path** (`/import`) — the Dropbox entry:

1. `external/dropbox.listFolder('/Camera Uploads')` — **metadata only**.
   Paginate: 2,000 entries per page, follow `has_more` + `cursor` until done.
2. `domain/cluster.clusterByGap(photos, 6)` → candidate events.
3. Per cluster, pick 3 photos spread across its time range, get temporary links,
   one `labelPhotos()` call → title and kind.
4. **Return candidates to the client without saving them.**
5. The screen shows "we found 14 events" — user taps who was in each.
6. Confirm → create the `EventDoc` rows.

Step 4 is the important one. Never write events the user hasn't tagged; an
untagged event contributes to no string and is just garbage in the database.

**Wrapped.** `GET /api/wrapped?year=2026` → every event you attended that year →
`domain/summarize.ts` (pure) → `{ topPeople[], topKinds[], eventCount,
photoCount, longestGap, monthHistogram }` → six slides. Write the copy as plain
templates; Dev 1 replaces them at hour 8.

**Three things that will bite you:**

- Dropbox temporary links expire in **4 hours**. Cache `thumbUrl` with a
  `fetchedAt` on the memory subdocument and refresh lazily on read.
- Everything goes through `external/storage.ts`, never `dropbox.ts` directly —
  that's what lets you flip to Vercel Blob if OAuth dies at hour 9.
- **Never move or copy the user's existing files.** Write new output only.

**Files:** `domain/{cluster,summarize}.ts` · `repo/memories.ts` ·
`services/{memories,import,wrapped}.ts` · `api/{events,memories,import,wrapped}` ·
`external/{auth,storage,dropbox}.ts` · `components/{Stamp,PhotoDrop,TabBar}.tsx` ·
`app/{import,add-event,passport,wrapped}`

**Done when:** import finds 10+ real events in a real Dropbox, tagging them
creates strings you can see on Dev 3's circle, the passport shows stamps, and
Wrapped renders six slides.

---

## Dev 1 — AI and Plans

> The profile, the matcher, the planner — and every LLM call in the app.

**Profile** (`/profile`): interest chips from a preset list plus free text, a
budget radio, city, and free-evening toggles. `PUT /api/profile` writes
`users.profile`. Twenty minutes of UI; it's the input the planner needs.

**Planner.** `POST /api/plan { personId }`:

1. Load both profiles, and the string's stamps via Dev 3's `services/strings`.
2. `domain/match.constraintsFor(a, b, stamps)` → budget, shared interests, past
   kinds, overlapping evenings, city. **Computed in code, before the model.**
3. One OpenAI call, structured output, schema = exactly three `Plan` objects.
4. **Validate every `becauseStampId` against the stamps you passed in.** Drop
   any plan that cites something that doesn't exist. If all three fail, retry
   once, then fall back to a template.
5. Return.

The prompt: system message says *"you may only reference memories from the
provided list, and must cite one by id in `becauseStampId`"*; user message is
JSON of the constraints plus the stamps. Nothing else.

**The five calls**, all in `external/openai.ts`:

| Function | Model | Returns |
| --- | --- | --- |
| `labelPhotos(urls)` | `gpt-4o-mini` vision | `{title, kind, place}` |
| `stampFor(caption, url)` | `gpt-4o-mini` | `{stampTitle, emoji, kind}` |
| `planFor(constraints, stamps)` | `gpt-4o-mini` | `Plan[3]` |
| `nudgeCopy(string)` | `gpt-4o-mini` | one line |
| `wrappedCopy(aggregates)` | `gpt-4o-mini` | six slides |

**Write `callJSON(schema, system, user)` in hour one** — one helper using
structured outputs that every call above goes through. It's the first thing the
other two need from you (`labelPhotos` blocks Dev 2's import).

**Done when:** `/api/plan` returns three validated plans in under five seconds,
every one cites a real memory, and none of them cost more than the poorer
friend's budget.

---

## Tree

```
invisible-string/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                          landing / sign in
│   │   ├── globals.css
│   │   ├── circle/                       [3] the graph — thickness + colour
│   │   │   ├── page.tsx
│   │   │   └── CircleView.tsx
│   │   ├── card/[id]/page.tsx            [3] one string: stamps + nudge
│   │   ├── discover/page.tsx             [3] 3–4 degree DFS
│   │   ├── import/                       [2] Dropbox camera roll import
│   │   │   ├── page.tsx
│   │   │   └── TagAttendees.tsx              "who was with you?"
│   │   ├── profile/page.tsx              [1] interests, budget, free evenings
│   │   ├── add-event/page.tsx            [2] manual event + photo + caption
│   │   ├── passport/page.tsx             [2] stamps
│   │   ├── wrapped/                      [2] year scrapbook
│   │   │   ├── page.tsx
│   │   │   └── Slides.tsx
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts   [2]
│   │       ├── strings/route.ts              [3] GET  my strings
│   │       ├── strings/[id]/route.ts         [3] GET  one + stamps
│   │       ├── discover/route.ts             [3] GET  3–4 degree
│   │       ├── events/route.ts               [2] POST create event
│   │       ├── memories/route.ts             [2] POST photo + caption
│   │       ├── import/route.ts               [2] POST run camera roll import
│   │       ├── wrapped/route.ts              [2] GET  year aggregate
│   │       ├── profile/route.ts              [1] GET/PUT interests + budget
│   │       └── plan/route.ts                 [1] POST meetup plans
│   │
│   ├── server/
│   │   ├── db/
│   │   │   ├── client.ts                 [3] Mongo connection, one instance
│   │   │   └── schema.ts                 [3] collection types — FROZEN hour 0
│   │   │
│   │   ├── domain/                           PURE. no I/O. `now` is an argument.
│   │   │   ├── strength.ts               [3] weight · decay · depth · warmth
│   │   │   ├── tiers.ts                  [3] warmth → tier, stroke, colour
│   │   │   ├── discover.ts               [3] bounded DFS, 3–4 degree
│   │   │   ├── match.ts                  [1] two profiles → plan constraints
│   │   │   ├── cluster.ts                [2] photos → events by time gap
│   │   │   └── summarize.ts              [2] stamps → wrapped aggregates
│   │   │
│   │   ├── repo/                             data access only, zero logic
│   │   │   ├── users.ts                  [3]
│   │   │   ├── friends.ts                [3]
│   │   │   ├── events.ts                 [3]
│   │   │   └── memories.ts               [2]
│   │   │
│   │   ├── services/                         the only layer allowed to mix
│   │   │   ├── strings.ts                [3]
│   │   │   ├── memories.ts               [2]
│   │   │   ├── import.ts                 [2]
│   │   │   ├── wrapped.ts                [2]
│   │   │   └── planner.ts                [1]
│   │   │
│   │   └── external/                         one file per vendor
│   │       ├── auth.ts                   [2] Auth.js — Google + Dropbox link
│   │       ├── storage.ts                [2] interface + impl switch
│   │       ├── dropbox.ts                [2]
│   │       ├── openai.ts                 [1] client + structured-output helper
│   │       └── calendar.ts               [1] optional — Google freeBusy
│   │
│   ├── components/
│   │   ├── Thread.tsx                    [3] the bowed string
│   │   ├── GraphCanvas.tsx               [3]
│   │   ├── StringCard.tsx                [3]
│   │   ├── NudgeCard.tsx                 [3] "Maya's fading" + Make a plan
│   │   ├── PlanCard.tsx                  [1] three suggestions
│   │   ├── Stamp.tsx                     [2]
│   │   ├── PhotoDrop.tsx                 [2]
│   │   └── TabBar.tsx                    [2]
│   │
│   ├── lib/
│   │   ├── types.ts                          THE FOUR CONTRACTS — frozen hour 0
│   │   └── world.ts                          client seam — all fetches go here
│   │
│   └── data/
│       └── mock.ts                           mock world, used until hour 3
│
├── scripts/
│   ├── seed.ts                           [3] a believable year of history
│   └── verify-demo.ts                    [3] asserts thick + grey works
│
├── public/
│   ├── icons/
│   ├── manifest.webmanifest
│   └── sw.js
│
├── .env.local.example
└── package.json
```

---

## The dependency rule

```
app/api  →  services  →  { domain, repo, external }
```

Arrows point one way only. **`domain/` imports nothing** — not the database,
not `fetch`, not even `Date.now()`. `now` is always passed in as an argument.

That one rule buys three things:
- `?now=2026-12-31` time travel for the demo, free
- domain functions are testable before the database exists
- Dev 3's `tiers.ts` can be imported straight into a React component for colours

---

## The four contracts — agreed at hour 0, then frozen

`src/lib/types.ts`. This is the **entire** integration surface between the three
of you. Get these right in the first 30 minutes and nobody blocks anybody.

```ts
export type Tier = "alive" | "warm" | "fading" | "cold";

export type Stamp = {
  eventId: string;
  title: string;          // "Ramen at 2am"
  emoji: string;
  kind: string;           // "food" | "hike" | "concert" | …
  happenedAt: string;     // ISO
  photoUrl: string | null;
  caption: string | null;
};

/** Dev 3 → everyone. The shape the whole UI renders. */
export type StringView = {
  personId: string;
  name: string;
  avatarUrl: string | null;
  depth: number;          // 0..1 → stroke width 1..6
  warmth: number;         // 0..1 → grey → red
  tier: Tier;
  eventCount: number;
  lastSeenAt: string | null;
  stamps: Stamp[];
};

/** Dev 3 owns the schema, Dev 2 writes to it. */
export type EventDoc = {
  _id: string;
  title: string;
  happenedAt: string;
  kind: string;
  groupId: string | null;
  createdBy: string;
  attendeeIds: string[];  // ← this array IS the string
  memories: {
    dropboxPath: string | null;
    thumbUrl: string | null;
    caption: string | null;
    stampTitle: string;
    stampEmoji: string;
    addedBy: string;
  }[];
};

/** Dev 1 → Dev 2. Vision pass over 3 sample photos from a cluster. */
export type PhotoLabel = { title: string; kind: string; place: string | null };
export type LabelPhotos = (imageUrls: string[]) => Promise<PhotoLabel>;

/** Dev 1 owns it. The planner matches against this. */
export type Profile = {
  interests: string[];        // ["bouldering", "ramen", "live music"]
  budget: "free" | "cheap" | "mid" | "splurge";
  city: string | null;
  freeEvenings: number[];     // 0=Sun … 6=Sat
};

/** Dev 1 → Dev 3 renders it in NudgeCard. */
export type Plan = {
  when: string;            // "Thursday evening"
  what: string;            // "ramen at Santouka"
  where: string | null;
  because: string;         // one line, grounded in a real memory
  becauseStampId: string;  // MUST resolve to a real stamp, or the plan is dropped
};
```

---

## Database — MongoDB, four collections

```js
users       { _id, email, name, avatarUrl,
              profile: { interests: [], budget, city, freeEvenings: [] },
              google:  { refreshToken },
              dropbox: { accessToken, refreshToken, accountId } }

friendships { _id, pair: [aId, bId], createdAt }      // sorted, undirected

groups      { _id, name, emoji, memberIds: [] }

events      { _id, title, happenedAt, kind, groupId, createdBy,
              attendeeIds: [ … ],
              memories: [ { … } ] }                   // embedded, always read together
```

One index is all you need:

```js
db.events.createIndex({ attendeeIds: 1, happenedAt: -1 })
```

Strength is **never stored**. It's a function of `now()`, so decay is always
correct with no cron job and no cache invalidation:

```js
const events = await db.collection("events")
  .find({ attendeeIds: me }).sort({ happenedAt: -1 }).toArray();
// then group by co-attendee in JS → domain/strength.ts
```

---

## The algorithm, in full

`src/server/domain/strength.ts` — this is the entire thing.

```ts
const decay = (days: number) => Math.exp(-days / 90);        // τ = 90 days

const weight = (e: EventFacts) =>
  1.0
  + (e.photoCount > 0 ? 0.3 : 0)
  + (e.caption      ? 0.2 : 0)
  + 1 / Math.log2(e.attendeeCount + 2);   // a 2-person dinner > a 50-person party

depth  = Σ weight(e)                                  // → stroke width
warmth = Σ weight(e) × decay(daysSince(e)) / depth    // → colour
```

**Two independent visual channels.** Thickness is how much history exists,
colour is how alive it is. A thick grey rope means *"this mattered and you're
losing it"* — that's the screen the whole app exists to produce.

Tiers: `warmth > 0.6` alive · `> 0.3` warm · `> 0.1` fading · else cold.

---

## Dropbox import

`/2/files/list_folder` on `/Camera Uploads` returns **metadata only** — paths and
`client_modified`. Cluster 2,400 photos without downloading any of them, then
download ~3 per cluster for the vision call. Forty downloads, not 2,400.

`src/server/domain/cluster.ts`:

```ts
export function clusterByGap(photos: PhotoMeta[], gapHours = 6): Cluster[] {
  const sorted = [...photos].sort((a, b) => +a.takenAt - +b.takenAt);
  const out: Cluster[] = [];
  for (const p of sorted) {
    const last = out.at(-1);
    const gap = last ? +p.takenAt - +last.endsAt : Infinity;
    if (gap > gapHours * 3_600_000)
      out.push({ photos: [p], startsAt: p.takenAt, endsAt: p.takenAt });
    else { last!.photos.push(p); last!.endsAt = p.takenAt; }
  }
  return out.filter(c => c.photos.length >= 3);   // 3+ photos = something happened
}
```

Then: *"We found 14 events in your camera roll. Who was with you?"* → the user
taps friends → a year of strings lights up at once. This also solves cold start:
Wrapped needs history, and the real camera roll supplies it.

**Never move or copy the user's existing files.** Write new output only, into
`/Apps/InvisibleString/`.

---

## Matching two profiles

`src/server/domain/match.ts` — pure, and it runs *before* the model so the AI
never has to be trusted with the constraint.

```ts
export function constraintsFor(a: Profile, b: Profile, stamps: Stamp[]) {
  return {
    budget: minBudget(a.budget, b.budget),        // never suggest what one can't afford
    shared: a.interests.filter(i => b.interests.includes(i)),
    either: [...new Set([...a.interests, ...b.interests])],
    kinds:  topKinds(stamps),                     // what they actually already do together
    evenings: a.freeEvenings.filter(d => b.freeEvenings.includes(d)),
    city: a.city === b.city ? a.city : null,      // no shared city → suggest virtual
  };
}
```

Two rules worth keeping: **budget is the minimum of the two**, not the average —
one broke friend vetoes the $$$ dinner. And **no shared city falls back to
virtual plans** rather than pretending geography isn't a problem.

`shared` interests rank first; `either` is the fallback when there's no overlap.
Past `kinds` beat stated interests when they disagree — what you actually do
together is better evidence than what you claim to like.

---

## Where the AI fits — five calls, all owned by Dev 1

| Call | Input → output |
| --- | --- |
| **Cluster → event** (vision) | 3 sample photos → `{title, kind, place}` |
| **Caption → stamp** | photo + caption → `{stampTitle, emoji, kind}` |
| **Meetup planner** | faded string + stamp history → 3 `Plan`s |
| **Nudge copy** | *"Four months since the ramen place with Maya."* |
| **Wrapped narration** | year aggregates → 6 slides of copy |

**What the AI never does:** compute strength, rank anything, or invent a memory.
Every output either cites a real stamp id or gets dropped. Strength and decay are
arithmetic — fully explainable, no model in the loop.

---

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| App | Next.js 15 · React 18 · Tailwind · PWA | already in the repo |
| DB | MongoDB Atlas M0 + official `mongodb` driver | no migrations, no Mongoose ceremony |
| Auth | Auth.js v5 | Google sign-in, Dropbox as a secondary link |
| Files | Dropbox API (raw `fetch`, no SDK) | behind `storage.ts`, Vercel Blob fallback |
| AI | OpenAI `gpt-4o-mini` + vision | structured outputs |
| Motion | framer-motion | string draw-in |
| Deploy | Vercel | |

```bash
npm i mongodb next-auth@beta openai framer-motion
```

---

## Setup

`.env.local`:

```
MONGODB_URI=
AUTH_SECRET=                  # npx auth secret
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
DROPBOX_APP_KEY=
DROPBOX_APP_SECRET=
OPENAI_API_KEY=
BLOB_READ_WRITE_TOKEN=        # fallback only
```

```bash
npm install
npm run seed      # a year of history — Wrapped and decay both need this
npm run dev
npm run verify    # asserts a 14-event, 8-month-old string comes out thick and grey
```

### Two OAuth traps — handle these in the first hour, not at hour 8

- **Google:** an unverified app only works for accounts added as **test users** in
  the Cloud Console. Add all four of you now.
- **Dropbox:** dev mode caps you at **5 linked users**. You need **Full Dropbox**
  access (not App Folder) to read `/Camera Uploads`. Scopes: `files.metadata.read`,
  `files.content.read`, `files.content.write`, `sharing.write`. Put
  `token_access_type=offline` in the auth URL or you get a 4-hour token with no
  refresh and it dies mid-demo.

---

## Schedule

**Hours 0–1.5 — foundation.** Non-overlapping by construction.

| Dev 1 | Dev 2 | Dev 3 |
| --- | --- | --- |
| OpenAI client + structured-output helper; prove one vision call and one text call work | Auth.js — Google sign-in **and** Dropbox link | Mongo client, `db/schema.ts`, `seed.ts` |

First 30 minutes of that, all four together: agree `src/lib/types.ts`. Then freeze it.

**Hours 1.5–8 — one feature each, top to bottom.** No hard checkpoint; the
contracts are the checkpoint.

**Hours 8–9 — integration.** Dev 1 swaps templates for AI copy.

**Hours 9–10 — three full demo run-throughs, then deploy.**

### Two things that must exist before hour 3, or the demo doesn't work

1. **`scripts/seed.ts`** — Wrapped needs history and decay needs old events.
   Neither can be created live on stage.
2. **A `?now=` override** — pass a fake current date so you can show a red string
   going grey on demand. Two lines of code, and it's the difference between
   describing decay and demonstrating it.

---

## Demo, 30 seconds each

1. **Dev 2** — "here's my actual camera roll" → import → 14 events found
2. **Dev 3** — the circle: thick and red, thin and grey → "Maya's gone grey"
3. **Dev 1** — "so it suggests" → three plans, one citing the ramen photo
4. **Dev 2** — Wrapped as the closer

That order is also the cut order if you're behind at hour 9.

---

## Explicitly not building

Facebook Graph API (App Review–gated, no public event search — use a
`candidateEvents.json` instead) · embeddings · push notifications (fake them
in-app) · real-time · image moderation · groups beyond a name · discovery
beyond one plain DFS tab.
