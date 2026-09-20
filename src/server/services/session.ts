import { auth } from "@/auth";

/**
 * Who you're signed in as. Every read path goes through this one function, so
 * there is exactly one place that decides whose data a request may see.
 */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new UnauthorizedError();
  return id;
}

/** Null instead of throwing, for the places that render a signed-out state. */
export async function optionalUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Not signed in");
    this.name = "UnauthorizedError";
  }
}
