import OpenAI from "openai";
import type { PhotoLabel, StampDraft, Plan, WrappedSlide } from "@/lib/types";
import { EVENT_KINDS } from "@/lib/types";

/**
 * EVERY LLM CALL IN THE APP LIVES HERE.
 *
 * One helper — `callJSON` — and five thin functions on top of it. Nothing else
 * in the codebase talks to OpenAI, so if the API misbehaves there's exactly one
 * file to look in.
 *
 * Two rules the rest of the app depends on:
 *
 *   1. Every call uses structured outputs. No prose parsing, no "sometimes it
 *      wraps the JSON in a code fence".
 *   2. Nothing here decides anything. The model labels, phrases and suggests;
 *      constraints are computed in `domain/match.ts` before we get here, and
 *      citations are validated in `services/planner.ts` after. A model that
 *      hallucinates a memory produces a dropped plan, not a lie on screen.
 */

/**
 * Both overridable, so a different provider is a config change rather than a
 * code change. Anything speaking the OpenAI chat-completions shape works —
 * point `OPENAI_BASE_URL` at it and set `LLM_MODEL`. Check the provider
 * supports json_schema response formats before you switch; if it only does
 * `json_object`, this file needs a small branch.
 */
const MODEL = process.env.LLM_MODEL || "gpt-4o-mini";

let client: OpenAI | null = null;
function openai() {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    client = new OpenAI({ apiKey, baseURL: process.env.OPENAI_BASE_URL || undefined });
  }
  return client;
}

/** True when we can actually call out. Lets callers fall back to templates. */
export function aiAvailable() {
  return Boolean(process.env.OPENAI_API_KEY);
}

type JsonSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required: string[];
  additionalProperties: false;
};

/**
 * The one helper. Structured outputs in strict mode, so `schema` must list
 * every property in `required` and set `additionalProperties: false` — the API
 * rejects anything looser.
 *
 * Retries once. A second failure throws, and every caller has a template
 * fallback for that case.
 */
export async function callJSON<T>({
  name,
  schema,
  system,
  user,
  images,
  temperature = 0.7,
}: {
  name: string;
  schema: JsonSchema;
  system: string;
  user: string;
  images?: string[];
  temperature?: number;
}): Promise<T> {
  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    { type: "text", text: user },
    ...(images ?? []).map(
      (url) =>
        ({ type: "image_url", image_url: { url, detail: "low" } }) as const,
    ),
  ];

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await openai().chat.completions.create({
        model: MODEL,
        temperature,
        messages: [
          { role: "system", content: system },
          { role: "user", content },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name, schema, strict: true },
        },
      });

      const choice = res.choices[0];
      if (choice.message.refusal) throw new Error(`refused: ${choice.message.refusal}`);
      const text = choice.message.content;
      if (!text) throw new Error("empty response");
      return JSON.parse(text) as T;
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`callJSON(${name}) failed: ${String(lastError)}`);
}

/* ------------------------------------------------------------------ *
 * 1. Cluster → event.  Dev 2's import calls this once per cluster.
 * ------------------------------------------------------------------ */

/**
 * Three sample photos from one time-cluster → what that event was.
 *
 * Deliberately short output. The user is about to see fourteen of these at
 * once and will re-title the ones we got wrong, so a wrong-but-short guess
 * costs them a tap; a wrong-and-verbose one costs them attention.
 */
export async function labelPhotos(imageUrls: string[]): Promise<PhotoLabel> {
  return callJSON<PhotoLabel>({
    name: "photo_label",
    schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "4 words or fewer, no date" },
        kind: { type: "string", enum: [...EVENT_KINDS] },
        place: { type: ["string", "null"], description: "only if legible in a photo" },
      },
      required: ["title", "kind", "place"],
      additionalProperties: false,
    },
    system:
      "You name photo albums. Given photos from a single occasion, give it a short human title, " +
      "the kind of occasion it was, and a place only if a sign or landmark makes it obvious. " +
      "Never guess a place. Never mention how many photos there are.",
    user: "What was this? Title it in four words or fewer.",
    images: imageUrls.slice(0, 3),
    temperature: 0.4,
  });
}

/* ------------------------------------------------------------------ *
 * 2. Caption → stamp.  Dev 2 calls this when a photo is added by hand.
 * ------------------------------------------------------------------ */

export async function stampFor(
  caption: string | null,
  imageUrl?: string | null,
): Promise<StampDraft> {
  return callJSON<StampDraft>({
    name: "stamp_draft",
    schema: {
      type: "object",
      properties: {
        stampTitle: { type: "string", description: "4 words or fewer" },
        stampEmoji: { type: "string", description: "exactly one emoji" },
        kind: { type: "string", enum: [...EVENT_KINDS] },
      },
      required: ["stampTitle", "stampEmoji", "kind"],
      additionalProperties: false,
    },
    system:
      "You turn a moment into a passport stamp: a very short title, one emoji, and a kind. " +
      "Match the caption's own voice. If the caption is a joke, keep the joke.",
    user: caption?.trim() ? `Caption: ${caption}` : "No caption. Go on the photo alone.",
    images: imageUrl ? [imageUrl] : undefined,
    temperature: 0.6,
  });
}

/* ------------------------------------------------------------------ *
 * 3. The planner.  services/planner.ts owns the validation around this.
 * ------------------------------------------------------------------ */

/**
 * Returns three plans. Each MUST cite a stamp id from `stampsJson` — the caller
 * drops any that doesn't, which is why the schema makes the field required and
 * the prompt says it twice.
 */
export async function planFor({
  constraintsJson,
  stampsJson,
  candidatesJson,
  theirName,
}: {
  constraintsJson: string;
  stampsJson: string;
  candidatesJson: string | null;
  theirName: string;
}): Promise<{ plans: Plan[] }> {
  return callJSON<{ plans: Plan[] }>({
    name: "meetup_plans",
    schema: {
      type: "object",
      properties: {
        plans: {
          type: "array",
          description: "exactly three",
          items: {
            type: "object",
            properties: {
              when: { type: "string", description: "e.g. 'Thursday evening'" },
              what: { type: "string", description: "one concrete thing to do" },
              where: { type: ["string", "null"] },
              because: {
                type: "string",
                description: "one sentence tying it to the cited memory",
              },
              becauseStampId: {
                type: "string",
                description: "an eventId from the memories list. Never invent one.",
              },
            },
            required: ["when", "what", "where", "because", "becauseStampId"],
            additionalProperties: false,
          },
        },
      },
      required: ["plans"],
      additionalProperties: false,
    },
    system: [
      "You suggest three specific things two friends could do together to catch up.",
      "",
      "Hard rules:",
      "- You may only reference memories from the provided list. Never invent one.",
      "- Every plan must cite one by its eventId in becauseStampId.",
      "- Respect the budget ceiling exactly. It is the poorer friend's limit, not a suggestion.",
      "- If virtual is true they are in different cities: every plan must work over a call.",
      "- If `slots` is non-empty, `when` must be one of those strings copied exactly —",
      "  they are real gaps in both calendars. Otherwise use a day from `evenings`,",
      "  and if that is empty too, say 'sometime soon'.",
      "- No emoji, no exclamation marks, no 'reconnect' or 'catch up vibes'. Write like a friend texting.",
      "",
      "About `where`:",
      "- If nearby places or events are provided, put the exact name of one in `where`.",
      "  Copy it character for character. A place that does not exist sends someone",
      "  to the wrong address, so a wrong name is worse than an empty field.",
      "- Match `serves` to what you're proposing. A place that serves pizza is not",
      "  where you go for ramen. If nothing on the list serves the right thing,",
      "  change the plan to match a place that does, or set `where` to null.",
      "- If nothing in the list fits the plan, set `where` to null. Never invent a venue.",
      "",
      "Make the three plans genuinely different from each other — not one idea three ways.",
    ].join("\n"),
    user: [
      `Their name: ${theirName}`,
      ``,
      `Constraints:`,
      constraintsJson,
      ``,
      `Shared memories:`,
      stampsJson,
      ``,
      candidatesJson
        ? `Nearby places and events you may name in \`where\`:\n${candidatesJson}`
        : `No venue list available — set \`where\` to null on every plan.`,
    ].join("\n"),
    temperature: 0.8,
  });
}

/* ------------------------------------------------------------------ *
 * 4. Paste anything → interests.
 *
 * The universal connector. Beli has no API, Letterboxd has no API, Goodreads
 * shut theirs down and Instagram's is business-accounts-only — but all of
 * them let you copy text out. One paste box covers every service we'll never
 * get OAuth for, and it's the thing that still works when a live OAuth flow
 * dies on stage.
 * ------------------------------------------------------------------ */

export async function extractInterests(text: string): Promise<{ interests: string[] }> {
  return callJSON<{ interests: string[] }>({
    name: "extracted_interests",
    schema: {
      type: "object",
      properties: {
        interests: {
          type: "array",
          description: "at most 10",
          items: { type: "string", description: "1-3 words, lowercase" },
        },
      },
      required: ["interests"],
      additionalProperties: false,
    },
    system: [
      "You read a messy dump of someone's taste — a restaurant list, a film diary,",
      "a playlist, a bio, anything — and pull out what they are actually into.",
      "",
      "- 1 to 3 words each, lowercase, at most 10.",
      "- Name the *interest*, not the item. Four ramen places means 'ramen',",
      "  not four restaurant names.",
      "- Prefer things two people could plan around: 'bouldering', 'live music',",
      "  'natural wine'. Skip traits like 'curious' or 'creative'.",
      "- Only what the text supports. An empty list is a fine answer.",
    ].join("\n"),
    user: text.slice(0, 6000),
    temperature: 0.3,
  });
}

/* ------------------------------------------------------------------ *
 * 5 & 6. Copy. Devs 2 and 3 ship templates; these replace them at hour 8.
 * ------------------------------------------------------------------ */

export async function nudgeCopy({
  name,
  monthsSince,
  lastStampTitle,
}: {
  name: string;
  monthsSince: number;
  lastStampTitle: string | null;
}): Promise<{ line: string }> {
  return callJSON<{ line: string }>({
    name: "nudge_line",
    schema: {
      type: "object",
      properties: { line: { type: "string", description: "one sentence, under 90 characters" } },
      required: ["line"],
      additionalProperties: false,
    },
    system:
      "You write one quiet line reminding someone a friendship is going cold. " +
      "Never guilt-trip, never use the words 'reconnect', 'reach out' or 'lately'. " +
      "State the fact and let it land. Under 90 characters.",
    user: `Friend: ${name}. Months since you saw them: ${monthsSince}. Last thing you did: ${
      lastStampTitle ?? "unknown"
    }.`,
    temperature: 0.7,
  });
}

export async function wrappedCopy(aggregatesJson: string): Promise<{ slides: WrappedSlide[] }> {
  return callJSON<{ slides: WrappedSlide[] }>({
    name: "wrapped_copy",
    schema: {
      type: "object",
      properties: {
        slides: {
          type: "array",
          description: "exactly six",
          items: {
            type: "object",
            properties: {
              headline: { type: "string", description: "4 words or fewer" },
              line: { type: "string", description: "one sentence" },
            },
            required: ["headline", "line"],
            additionalProperties: false,
          },
        },
      },
      required: ["slides"],
      additionalProperties: false,
    },
    system:
      "You write a year-in-review about someone's friendships, six slides. " +
      "Use only the numbers given — never invent a person, place or count. " +
      "Warm but dry. No exclamation marks, no 'wow', no second-person hype.",
    user: aggregatesJson,
    temperature: 0.8,
  });
}
