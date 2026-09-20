import { NextResponse } from "next/server";
import { requireUserId, UnauthorizedError } from "@/server/services/session";
import { NoFolderError, NotConnectedError } from "@/server/external/storage";

/**
 * One place that turns a thrown error into a status code, so every route
 * agrees on what "not signed in" and "no Dropbox yet" look like to the client.
 *
 * The distinction matters to the UI: 401 means go and sign in, 409 means the
 * account is fine but a setup step is missing, and the import screen shows a
 * different thing for each.
 */
export async function withUser<T>(
  handler: (userId: string) => Promise<T>,
): Promise<NextResponse> {
  try {
    // Resolving the user and running the handler share one catch on purpose.
    // Split, an unreachable database during sign-in resolution reads as "not
    // signed in", which sends you looking in exactly the wrong place.
    const userId = await requireUserId();
    return NextResponse.json(await handler(userId));
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * The same mapping, for routes that can't use `withUser` because they return
 * their own status codes along the way. Every route must end up here rather
 * than letting a throw escape: an uncaught error is a 500 with an empty body,
 * and an empty body is what makes the client say "Unexpected end of JSON
 * input" instead of what actually went wrong.
 */
export function errorResponse(err: unknown): NextResponse {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  if (err instanceof NotConnectedError) {
    return NextResponse.json({ error: err.message, needs: "dropbox" }, { status: 409 });
  }
  if (err instanceof NoFolderError) {
    return NextResponse.json({ error: err.message, needs: "folder" }, { status: 409 });
  }
  const message = err instanceof Error ? err.message : "Something went wrong";
  return NextResponse.json({ error: message }, { status: 502 });
}
