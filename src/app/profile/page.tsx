import ProfileForm from "./ProfileForm";

export const metadata = { title: "Your profile · Invisible String" };

// Auth is disabled for now (see src/auth.ts) — no session to gate on or show.
export default function ProfilePage() {
  return <ProfileForm />;
}
