import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { mongoClientPromise } from "@/server/db/client";

/**
 * Google is both sign-in and the calendar connection. Asking for offline
 * access gives us a refresh token, which the server stores in MongoDB through
 * the Auth.js adapter; users never paste a Calendar token into an env file.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  // No MONGODB_URI yet? Fall back to JWT sessions instead of crashing every
  // page that imports this module (e.g. the sign-in page itself).
  adapter: mongoClientPromise ? MongoDBAdapter(mongoClientPromise) : undefined,
  session: { strategy: mongoClientPromise ? "database" : "jwt" },
  providers: [
    Google({
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope: "openid email profile https://www.googleapis.com/auth/calendar.readonly",
        },
      },
    }),
  ],
  pages: { signIn: "/signin" },
});
