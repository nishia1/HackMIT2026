import { redirect } from "next/navigation";

// Auth is disabled for now (see src/auth.ts) — straight into the app.
export default function Home() {
  redirect("/circle");
}
