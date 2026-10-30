// Encrypts the real trades file so it can be committed to this public repo.
//   ADMIN_PASSWORD='…' node admin/tools/encrypt-trades.mjs [in=admin/data/trades.json] [out=admin/data/trades.enc.json]
// The page (admin/admin.js → decrypt) reverses this with the password typed at the gate.
// Never commit the plain admin/data/trades.json; it is git-ignored.
import { webcrypto as crypto } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const [, , input = "admin/data/trades.json", output = "admin/data/trades.enc.json"] = process.argv;
const pw = process.env.ADMIN_PASSWORD;
if (!pw) { console.error("Set ADMIN_PASSWORD (the admin page password) in the environment."); process.exit(1); }

const plain = readFileSync(input, "utf8");
const data = JSON.parse(plain);
const ids = new Set((data.strategies || []).map((s) => s.id));
const bad = (data.trades || []).filter((t) => !/^\d{4}-\d{2}-\d{2}$/.test(t.date) || typeof t.r !== "number" || !ids.has(t.strategy));
if (!data.strategies?.length || !data.trades?.length || bad.length) {
  console.error(`Invalid trades file: need strategies[] and trades[] with date YYYY-MM-DD, numeric r, known strategy. Bad rows: ${bad.length}`);
  process.exit(1);
}

const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const iter = 250000;
const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
const b64 = (u) => Buffer.from(u).toString("base64");
writeFileSync(output, JSON.stringify({ v: 1, kdf: "PBKDF2-SHA256", cipher: "AES-GCM-256", iter, salt: b64(salt), iv: b64(iv), data: b64(new Uint8Array(ct)) }) + "\n");
console.log(`Encrypted ${data.trades.length} trades (${data.strategies.length} strategies) → ${output}`);
