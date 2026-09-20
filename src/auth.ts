import NextAuth from "next-auth";
// import Google from "next-auth/providers/google";
// import { MongoDBAdapter } from "@auth/mongodb-adapter";
// import { mongoClientPromise } from "@/server/db/client";

/**
 * Google + Mongo adapter disabled for now — OAuth and the database were both
 * unreliable on this network and were blocking every other page. `auth()`
 * just returns null everywhere with no providers configured; every page that
 * used to gate on a session now has to work without one. Re-enable by
 * uncommenting the imports and the `Google(...)` entry below once both are
 * reliably reachable again.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  // adapter: mongoClientPromise ? MongoDBAdapter(mongoClientPromise) : undefined,
  // session: { strategy: mongoClientPromise ? "database" : "jwt" },
  providers: [
    // Google({
    //   authorization: {
    //     params: {
    //       access_type: "offline",
    //       prompt: "consent",
    //       scope: "openid email profile https://www.googleapis.com/auth/calendar.readonly",
    //     },
    //   },
    // }),
  ],
  pages: { signIn: "/signin" },
});
