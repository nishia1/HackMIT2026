import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { optionalUserId } from "@/server/services/session";

export const dynamic = "force-dynamic";

/**
 * The front door. One button, because the app has exactly one thing to ask —
 * where your photos are — and the same consent answers who you are.
 */
export default async function SignIn() {
  if (await optionalUserId()) redirect("/import");

  return (
    <div className="flex min-h-[70vh] flex-col justify-center">
      <h1 className="font-display text-4xl leading-tight">Invisible String</h1>
      <p className="mt-3 text-inkSoft">
        There are more connections around you than you can see. Point us at your
        camera roll and we will show you the ones you already have.
      </p>

      <form
        action={async () => {
          "use server";
          await signIn("dropbox", { redirectTo: "/import" });
        }}
      >
        <button
          type="submit"
          className="mt-8 w-full rounded-md bg-string px-4 py-3 text-paper"
        >
          Continue with Dropbox
        </button>
      </form>

      <p className="mt-4 text-sm text-inkSoft">
        We read the dates on your photos, never the files themselves, and nothing is
        ever written back to your Dropbox.
      </p>
    </div>
  );
}
