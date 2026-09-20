import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { claimOrCreate, setDropbox } from "@/server/repo/users";

/**
 * Signing in with Dropbox, with our own `users` collection rather than an
 * adapter's.
 *
 * The schema here predates auth: users have string ids, a `profile`, and a
 * Dropbox connection. An adapter would insist on owning that collection and
 * its own id shape, so instead the session is a JWT and the one thing it
 * carries is our user id, resolved once at sign-in.
 *
 * The same exchange that proves who you are also yields the tokens the import
 * reads your roll with, so they are stored here and there is no second
 * "connect Dropbox" step anywhere in the app.
 */

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    /**
     * `account` is present only on the request where someone actually signs
     * in. Every later request just carries the token, so the database is
     * touched once per session, not once per page.
     */
    async jwt({ token, account, user }) {
      if (!account || !user?.email) return token;

      const doc = await claimOrCreate({
        email: user.email,
        name: user.name ?? user.email,
        avatarUrl: user.image ?? null,
      });
      token.uid = doc._id;

      if (account.access_token) {
        await setDropbox(doc._id, {
          accessToken: account.access_token,
          // Dropbox issues a refresh token on first consent. Coming back
          // through an approval you already granted can return none, and
          // overwriting the stored one with nothing would break renewal.
          refreshToken: account.refresh_token ?? null,
          accountId: account.providerAccountId,
          expiresAt: new Date(
            account.expires_at ? account.expires_at * 1000 : Date.now() + 4 * 60 * 60 * 1000,
          ).toISOString(),
        });
      }

      return token;
    },
    async session({ session, token }) {
      if (token.uid) session.user.id = token.uid as string;
      return session;
    },
  },
});
