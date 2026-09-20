import Dropbox from "next-auth/providers/dropbox";
import type { NextAuthConfig } from "next-auth";

/**
 * The half of the auth config that must never touch the database.
 *
 * Middleware runs on the edge runtime, where the Mongo driver cannot load. So
 * providers, pages and the route guard live here, and everything that reads
 * Mongo lives in auth.ts — which middleware never imports.
 *
 * Dropbox is the identity, not just the photo source. The app has exactly one
 * thing to ask of a new user — where their photos are — so making them sign in
 * somewhere else first and *then* connect Dropbox was two consents for one
 * decision. This is one.
 */

/** Reachable without a session. Everything else redirects to /signin. */
const PUBLIC = ["/signin"];

export const authConfig = {
  providers: [
    Dropbox({
      // Named for the Dropbox App Console rather than Auth.js's AUTH_DROPBOX_*
      // convention, because that is what the console calls them.
      clientId: process.env.DROPBOX_APP_KEY,
      clientSecret: process.env.DROPBOX_APP_SECRET,
      authorization: {
        url: "https://www.dropbox.com/oauth2/authorize",
        params: {
          // The provider defaults to offline already; repeated here because
          // without it the grant is a four-hour token and no way to renew it.
          token_access_type: "offline",
          // account_info.read is the provider's default and identifies the
          // user. The other two are what the import actually needs.
          scope: "account_info.read files.metadata.read files.content.read",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    authorized({ request, auth }) {
      const { pathname } = request.nextUrl;
      if (PUBLIC.some((p) => pathname.startsWith(p))) return true;
      return Boolean(auth?.user);
    },
  },
} satisfies NextAuthConfig;
