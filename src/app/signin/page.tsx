import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect("/profile");

  return (
    <main className="space-y-6 pt-16">
      <header>
        <h1 className="font-display text-4xl">Invisible String</h1>
        <p className="mt-3 text-inkSoft">
          Sign in to save your profile and let plans use your real free/busy calendar.
        </p>
      </header>
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
      <p className="text-sm text-inkSoft">
        We only request calendar free/busy access; event titles and details are never read.
      </p>
    </main>
  );
}
