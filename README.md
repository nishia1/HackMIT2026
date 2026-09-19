# Invisible String

There are more connections around you than you can see.

A PWA that treats your campus as one graph — people, courses, clubs, labs,
interests, places and events are all the same kind of thing — and finds the
explainable paths between you and someone you haven't met.

## Run it

```bash
npm install
npm run dev
```

That's it. No database, no API keys, no `.env` file. Data lives in
`src/data/world.ts`.

```bash
npm run verify   # prints what the Explore feed will say, without the browser
npm run check    # typecheck
npm run build    # production build (needs internet the first time, for fonts)
```

## Deploy it

Push to GitHub, then import the repo at vercel.com. Framework detection picks
up Next.js and there's nothing to configure. Every branch gets its own preview
URL, which is the fastest way to settle an argument about whose version looks
better.

Once it's live, open it on a phone and use "Add to Home Screen" — it installs
as a real app, full screen, its own icon.

## How it works in one minute

`src/data/world.ts` holds nodes (people, courses, clubs, events…) and edges
between them, each with a **weight** from 0 to 1 — how much that connection
counts as evidence. A 300-person lecture is thin. An 8-person lab is thick.

`src/lib/graph/strings.ts` walks that graph and finds every path from you to
another person, up to four hops. It then scores each path and throws most of
them away. Two ideas do the heavy lifting:

- **Rarity.** A shared node is worth `1 / log2(degree + 2)`, so the small lab
  beats the big lecture, and popular hubs can't dominate every result.
- **A floor.** Anything below `MIN_STRAND_SCORE` is dropped — "you're both at
  Georgia Tech" is true of 45,000 people and tells you nothing.

What survives is a handful of real, separate reasons two people are near each
other. That's a *string*.

There is no LLM in the loop. The phrasing in `describe.ts` is templated on
purpose: the paths are the product, and every line on a Connection Card has to
expand into something true. If you add a model later, hand it these same facts
and forbid it from adding any name, event or date that isn't in them.

## Where to put your code

```
src/data/world.ts        ← the data. Edit this first.
src/lib/world.ts         ← the seam. Every screen talks to the app through here.
src/lib/graph/           ← the algorithm. types · core · strings · describe
src/lib/passport.ts      ← localStorage, so the passport survives a refresh
src/app/circle           ← your world as a map
src/app/explore          ← the reveal
src/app/passport         ← stamps and followed strings
src/app/card/[id]        ← one Connection Card
src/components/          ← Thread · GraphCanvas · ConnectionCard · TabBar
```

**Adding a feature:** write a function in `src/lib/world.ts`, then build a
screen that calls it. Don't import from `src/lib/graph/` inside a component —
keeping everything behind that one file is what makes swapping in a real
backend a one-file change later.

**Adding a backend:** make the functions in `src/lib/world.ts` `async` and
`fetch()` instead of reading the mock data. The screens already `await` them,
so no UI has to change.

## Working in parallel

The four areas below barely touch each other, so you can split them without
stepping on anyone:

| Area | Files | Depends on |
| --- | --- | --- |
| The world | `src/data/world.ts` | nothing |
| Algorithm | `src/lib/graph/*` | nothing |
| Circle & cards | `src/app/circle`, `src/components/GraphCanvas.tsx` | `lib/world.ts` |
| Explore & passport | `src/app/explore`, `src/app/passport` | `lib/world.ts` |

The one file everyone shares is `src/lib/world.ts`. Add to it, don't rewrite
it, and merges stay boring.

## Already built into the demo data

Open `/explore` and you get Jordan: someone you've never met, with five
separate strings to you — the Robotics Showcase, Embodied AI, HackMIT, mutual
friend Maya, and CS 3600 — one of which is an event you're both already going
to tomorrow. Maya is deliberately the decoy: closer, more obvious, less
interesting.

Run `npm run verify` any time you change edge weights to check that still
holds. It prints the whole feed in about a second.

## Not built yet

- **`whatIf()` in `src/lib/world.ts` works and has no screen.** Ask it "who
  else is into robotics" and it returns ranked people with their strings. It's
  the highest-value thing left and it's maybe forty lines of UI.
- **Icons** in `public/icons/` are generated placeholders. Replace them — on a
  phone they're the first thing anyone sees.
- **Design direction:** riso-printed atlas. Lavender-grey paper, ink violet,
  and one loud colour (`#E2483D`) used *only* for threads. If you add a screen,
  keep the red for string and nothing else — it's the whole visual idea.
