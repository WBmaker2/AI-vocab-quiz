import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const REQUIRED_HEADERS = [
  "x-content-type-options",
  "referrer-policy",
  "x-frame-options",
  "permissions-policy",
  "cross-origin-opener-policy",
  "strict-transport-security",
];

function normalizeHeaders(entries) {
  return Object.fromEntries(
    entries.map(({ key, value }) => [key.toLowerCase(), value]),
  );
}

test("vercel.json sets required security headers", async () => {
  const config = JSON.parse(await readFile(path.join(root, "vercel.json"), "utf8"));
  const headers = normalizeHeaders(config.headers?.[0]?.headers ?? []);

  for (const name of REQUIRED_HEADERS) {
    assert.ok(headers[name], `missing ${name}`);
  }

  assert.match(headers["permissions-policy"], /microphone=\(self\)/);
  assert.match(headers["cross-origin-opener-policy"], /same-origin-allow-popups/);
});

test("firebase.json sets required hosting headers", async () => {
  const config = JSON.parse(await readFile(path.join(root, "firebase.json"), "utf8"));
  const headers = normalizeHeaders(config.hosting?.headers?.[0]?.headers ?? []);

  for (const name of REQUIRED_HEADERS) {
    assert.ok(headers[name], `missing ${name}`);
  }
});
