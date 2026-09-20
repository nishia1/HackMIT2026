import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/**
 * Signed out, every route is /signin. The `authorized` callback in
 * auth.config decides; this file only says where it applies.
 */
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  /**
   * Pages only.
   *
   * `/api` is left out deliberately: a redirect to a sign-in page is the right
   * answer for someone in a browser and the wrong one for `fetch`, which would
   * follow it and hand the caller a page of HTML where it expected JSON. The
   * routes guard themselves and answer 401.
   */
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons).*)"],
};
