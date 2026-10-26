import test from "node:test";
import assert from "node:assert/strict";
import { readAppCheckConfig } from "./appCheck.js";

test("readAppCheckConfig is disabled without a site key", () => {
  assert.deepEqual(readAppCheckConfig({}), {
    siteKey: "",
    debugToken: "",
    enabled: false,
  });
});

test("readAppCheckConfig trims values and enables with a site key", () => {
  assert.deepEqual(
    readAppCheckConfig({
      VITE_FIREBASE_APP_CHECK_SITE_KEY: "  site-key  ",
      VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN: "  debug-token  ",
    }),
    {
      siteKey: "site-key",
      debugToken: "debug-token",
      enabled: true,
    },
  );
});
