# Invisible String

**invisible strings connect us all!**

HackMIT 2026 · [hack-mit-2026.vercel.app](https://hack-mit-2026.vercel.app)

---

## Inspiration

Every social app is built to help you meet new people. None of them help you
keep the ones you already have. Friendships don't usually end, they just
quietly fade, and you don't notice until it's been eight months since you saw
someone who used to be your closest friend. We wanted to build the thing that
notices.

The insight that made it work is the fact that you've already documented every friendship you
have. It's sitting in your camera roll.

---

## What it does

Every friendship is an invisible string. It gets thicker every time you do
something together, and fades from red toward grey every month you don't.

Point it at your Dropbox and it clusters a year of photos into events, then asks
who was with you. A year of friendships lights up at once. From there:

- **The circle**: your whole social world as one picture. Thickness is how much
  history exists; colour is how alive it is. A thick grey rope means *this
  mattered and you're losing it*.
- **Nudges**: strings decay on a 90-day half-life, so the app can tell you who
  you're losing, ranked by how much history you're losing times how cold it's gone.
- **Plans**: three concrete things to do together, matched to both people's
  interests and budget, each one citing a real shared memory.
- **Passport & Wrapped**: every event becomes a stamp; the year closes as a
  scrapbook.

---

## How we built it

Next.js 15 · React 18 · Tailwind · MongoDB Atlas · Dropbox · OpenAI
`gpt-4o-mini` · Vercel
Deployed as a PWA so users can make it a iPhone shortcut and use it effectively as a mobile app

### The schema is the graph

There is no friendships table doing the work. `attendeeIds` on an event **is**
the edge. If you and another person are both in the array, that event thickens the string
between you. Every string in the app falls out of one query:

```js
db.events.find({ attendeeIds: me }).sort({ happenedAt: -1 })
```

behind one index, `{ attendeeIds: 1, happenedAt: -1 }`. Memories are embedded in
the event document rather than split into their own collection, because they are
never read apart from it — the event and its photos are always fetched together.

### Strength is never stored

Depth and warmth are computed from the events collection on every read, with
`now` passed in as an argument rather than read from the clock. Decay is
therefore always correct with no cron job or cache invalidation and we get
`?now=2026-12-31` time travel for free, which is how we demo a red string going
grey on stage.

Two independent visual channels: thickness is how much history exists, colour is
how alive it is.

### The import never downloads your camera roll

Dropbox's `list_folder` returns metadata only, so we cluster 2,400 photos by time
gap without fetching a single image, then download ~3 per cluster for one vision
call. Forty downloads, not 2,400.

### The AI is never trusted with the math

It labels photos, writes copy, and proposes plans but it never computes
strength, never ranks anything, and never invents a memory. Every plan must cite
a real stamp id, and any plan citing something that doesn't exist gets dropped
before it reaches the user. Strength and decay are arithmetic, fully
explainable, no model in the loop.

Underneath it all, one dependency rule `app/api → services → { domain, repo,
external }` and `domain/` imports nothing at all. Not the database, not
`fetch`, not even `Date.now()`.

---

## Individual Contributions

- **Nishi** worked on the graph: strength, decay, tiers, discovery, the circle and card
  screens, seed and verification scripts as well as passport and the Wrapped feature.
- **Carolyn** worked on photos and memories: Dropbox OAuth, camera-roll clustering,
  and stamps.
- **Linh** worked on AI and plans: the OpenAI layer, profile matching, the planner and
  its validation.
- **Hannah** focused on design, crafting the UI across every screen and integrating it into our application.

---

## Challenges we ran into

OAuth ate more hours than the entire graph engine. Google's unverified-app test
user rules, `redirect_uri_mismatch` across Vercel preview URLs, and Dropbox's
four-hour token expiry each cost us real time. Working through perm issues taught us a lot about the reality of developing! Debugging deployment perms was honestly a nightmare but it taught us a lot about the way Vercel vs standard local environments parse API keys and how small mistakes can compound over time.

We also learned that campus wifi blocks MongoDB's port 27017, which turns a
working app into a broken one until someone thinks to try a
hotspot :/ And merging four branches into a frozen contracts file at 2am is its own
kind of challenge so we ended up regenerating the lockfile from scratch rather
than trying to hand-resolve several thousand lines of dependency tree.

---

## Accomplishments that we're proud of

We never write an event the user hasn't tagged. The import returns candidates and
waits — an untagged event contributes to no string and is just garbage in the
database, so the user confirms who was there before anything is saved.

We kept the AI out of the arithmetic. Strength, decay, and ranking are pure
functions; the model labels photos and writes copy, and every plan it proposes
must cite a real memory by id or it gets dropped before the user sees it. Nothing
on screen is a hallucinated friendship. Though we live in an increasingly digital world, we believe that AI should be used to make our lives simpler but not take away the most human experience of connection, rather enhancing it by making logistics easier!

And the thing we set out to build actually renders: a rope that's thick and grey.
That's the entire emotional argument of the product in one visual and it comes straight out of math (thank you Grant Sanderson for teaching us the beauty of math time and time again!).

---

## What we learned

Agree your type contracts in the first thirty minutes and freeze them. Ours was
the only reason three people working in parallel never blocked each other as every
integration bug we hit was in OAuth, never in the seam between us.

Also: a one-way dependency rule with a pure domain layer isn't architectural
purity for its own sake. It's what made time travel a two-line feature instead of
a refactor.

---

## What's next

Real friend graphs via invites rather than a seeded world; calendar API integration
so plans land on a day both people are actually free; notifications for fading
strings; and swapping the storage layer to support Google Photos and iCloud
alongside Dropbox.
