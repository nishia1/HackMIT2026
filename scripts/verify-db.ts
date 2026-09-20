/**
 * Is the database actually reachable, and if not, which layer broke?
 *
 *   npm run verify:db
 *
 * A failed connection looks identical from the app — a hang, then an error —
 * whether the cause is a typo, a paused cluster or an IP that Atlas does not
 * recognise. This walks the layers in order and stops at the first one that
 * fails, because that is the only one worth fixing.
 */
import { MongoClient } from "mongodb";
import { Resolver } from "node:dns/promises";
import { connect } from "node:net";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "invisible-string";

function step(n: number, what: string) {
  process.stdout.write(`${n}. ${what.padEnd(34)}`);
}
const ok = (detail = "") => console.log(`ok   ${detail}`);
function die(why: string, fix: string): never {
  console.log("FAIL");
  console.error(`\n   ${why}\n\n   Fix: ${fix}\n`);
  process.exit(1);
}

/** Does a TCP connection open, and does the server tolerate our first bytes? */
function probe(host: string, port: number, timeout = 6000) {
  return new Promise<"open" | "reset" | "timeout">((resolve) => {
    const sock = connect({ host, port });
    const done = (r: "open" | "reset" | "timeout") => {
      sock.destroy();
      resolve(r);
    };
    sock.setTimeout(timeout, () => done("timeout"));
    sock.on("error", () => done("reset"));
    // A TLS ClientHello is what Atlas drops when the IP is not allowed, so
    // send one rather than trusting the bare TCP handshake.
    sock.on("connect", () => {
      sock.write(Buffer.from([0x16, 0x03, 0x01, 0x00, 0x01, 0x01]));
      setTimeout(() => done(sock.destroyed ? "reset" : "open"), 700);
    });
    sock.on("close", (hadError) => hadError && done("reset"));
  });
}

(async () => {
  console.log();

  step(1, "MONGODB_URI is set");
  if (!uri) {
    die("MONGODB_URI is empty or missing.", "Add it to .env.local — see .env.local.example.");
  }
  ok(uri.startsWith("mongodb+srv://") ? "(Atlas SRV)" : "(standard)");

  const host = uri.replace(/^mongodb(\+srv)?:\/\//, "").split("@").pop()!.split(/[/?]/)[0];
  const srv = uri.startsWith("mongodb+srv://");

  step(2, "hostname resolves");
  let targets: { host: string; port: number }[] = [];
  try {
    if (srv) {
      const recs = await new Resolver().resolveSrv(`_mongodb._tcp.${host}`);
      if (recs.length === 0) throw new Error("no SRV records");
      targets = recs.map((r) => ({ host: r.name, port: r.port }));
    } else {
      const [h, p] = host.split(":");
      targets = [{ host: h, port: Number(p) || 27017 }];
    }
  } catch (e) {
    die(
      `DNS lookup failed for ${host} — ${e instanceof Error ? e.message : e}`,
      "Check the cluster address in MONGODB_URI, and that you are online.",
    );
  }
  ok(`(${targets.length} node${targets.length === 1 ? "" : "s"})`);

  step(3, "server accepts a connection");
  const result = await probe(targets[0].host, targets[0].port);
  if (result === "timeout") {
    die(
      `${targets[0].host}:${targets[0].port} never answered.`,
      "A firewall is likely blocking outbound 27017 — try a phone hotspot.",
    );
  }
  if (result === "reset") {
    die(
      `${targets[0].host} accepted the connection, then closed it immediately.\n` +
        "   This happens before any password is sent, so it is not your credentials.",
      "Atlas → Network Access: add this machine's IP (or 0.0.0.0/0) and wait for\n" +
        "        it to say Active. Also check the cluster is not paused.",
    );
  }
  ok();

  step(4, "credentials accepted");
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  try {
    await client.connect();
    await client.db(dbName).command({ ping: 1 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await client.close().catch(() => {});
    if (/Authentication failed|bad auth/i.test(msg)) {
      die(
        `The server rejected the username or password.`,
        "Check the user in Atlas → Database Access. URL-encode special characters\n" +
          "        in the password (@ is %40, # is %23).",
      );
    }
    die(msg, "See the message above.");
  }
  ok();

  step(5, "can read and write");
  try {
    const col = client.db(dbName).collection("_healthcheck");
    const _id = `probe-${Date.now()}`;
    await col.insertOne({ _id, at: new Date() } as never);
    const back = await col.findOne({ _id } as never);
    await col.deleteOne({ _id } as never);
    if (!back) throw new Error("wrote a document but could not read it back");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await client.close().catch(() => {});
    die(
      msg,
      /not authorized/i.test(msg)
        ? "The database user needs readWrite on this database — Atlas → Database Access."
        : "See the message above.",
    );
  }
  ok();

  const counts = await client.db(dbName).collection("events").countDocuments();
  await client.close();
  console.log(`\n   Connected to "${dbName}". ${counts} event${counts === 1 ? "" : "s"} stored.\n`);
})();
