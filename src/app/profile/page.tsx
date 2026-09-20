import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import ProfileForm from "./ProfileForm";

export const metadata = { title: "Your profile · Invisible String" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  return (
    <>
      <div className="flex items-center justify-between pt-4 text-sm text-inkSoft">
        <span>{session.user.email}</span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/signin" });
          }}
        >
          <button type="submit" className="underline">Sign out</button>
        </form>
      </div>
      <ProfileForm />
    </>
  );
}
