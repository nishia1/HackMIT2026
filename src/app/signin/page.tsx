// import { auth, signIn } from "@/auth";
import Link from "next/link";

/**
 * Google auth is disabled for now (see src/auth.ts) — nothing here to sign
 * in with. Nothing links here anymore either (page.tsx goes straight to
 * /circle), so this only matters if someone navigates here directly.
 */
export default function SignInPage() {
  return (
    <main className="space-y-6 pt-16">
      <header>
        <h1 className="font-display text-4xl">Invisible String</h1>
        <p className="mt-3 text-inkSoft">
          Sign-in is switched off for now. Everything works without an account.
        </p>
      </header>
      {/*
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/profile" });
        }}
      >
        <button className="w-full rounded-md bg-ink px-4 py-3 text-paper" type="submit">
          Sign in with Google
        </button>
      </form>
      */}
      <Link href="/profile" className="inline-block rounded-md bg-ink px-4 py-3 text-paper">
        Go to profile
      </Link>
    </main>
  );
}
