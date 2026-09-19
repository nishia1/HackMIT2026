/**
 * One-time: turn your Dropbox app key and secret into a refresh token.
 *
 * Access tokens expire after four hours. A refresh token does not, so you do
 * this once and the app renews itself from then on.
 *
 *   DROPBOX_APP_KEY=… DROPBOX_APP_SECRET=… npm run dropbox:auth
 *
 * Open the URL it prints, approve, paste the code back. Put the refresh token
 * it gives you in .env.local as DROPBOX_REFRESH_TOKEN.
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const key = process.env.DROPBOX_APP_KEY;
const secret = process.env.DROPBOX_APP_SECRET;

if (!key || !secret) {
  console.error("Set DROPBOX_APP_KEY and DROPBOX_APP_SECRET first.");
  process.exit(1);
}

const authorize = new URL("https://www.dropbox.com/oauth2/authorize");
authorize.searchParams.set("client_id", key);
authorize.searchParams.set("response_type", "code");
// Without this Dropbox issues a short-lived token and no refresh token.
authorize.searchParams.set("token_access_type", "offline");

console.log(`\n1. Open this and approve:\n\n   ${authorize}\n`);

const rl = createInterface({ input: stdin, output: stdout });
const code = (await rl.question("2. Paste the code here: ")).trim();
rl.close();

const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
  method: "POST",
  headers: {
    Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: new URLSearchParams({ code, grant_type: "authorization_code" }),
});

if (!res.ok) {
  console.error(`\nExchange failed (${res.status}): ${await res.text()}`);
  process.exit(1);
}

const { refresh_token, account_id } = (await res.json()) as {
  refresh_token?: string;
  account_id?: string;
};

if (!refresh_token) {
  console.error("\nNo refresh token returned — was token_access_type=offline dropped?");
  process.exit(1);
}

console.log(`\nAuthorized${account_id ? ` as ${account_id}` : ""}. Add to .env.local:\n`);
console.log(`DROPBOX_REFRESH_TOKEN=${refresh_token}\n`);
