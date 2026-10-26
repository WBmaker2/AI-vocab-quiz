import test from "node:test";
import assert from "node:assert/strict";
import { initializeFirebaseAppCheck } from "./firebaseAppCheck.js";

test("initializeFirebaseAppCheck skips when no site key is configured", async () => {
  let loaded = false;
  const initialized = await initializeFirebaseAppCheck({
    app: {},
    env: {},
    isBrowser: true,
    loadAppCheck: async () => {
      loaded = true;
      return {};
    },
  });

  assert.equal(initialized, false);
  assert.equal(loaded, false);
});

test("initializeFirebaseAppCheck initializes with the configured site key", async () => {
  const calls = [];
  const initialized = await initializeFirebaseAppCheck({
    app: { name: "test-app" },
    env: { VITE_FIREBASE_APP_CHECK_SITE_KEY: "site-key" },
    isBrowser: true,
    loadAppCheck: async () => ({
      ReCaptchaV3Provider: class {
        constructor(siteKey) {
          this.siteKey = siteKey;
        }
      },
      initializeAppCheck: (app, options) => {
        calls.push({ app, options });
      },
    }),
  });

  assert.equal(initialized, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].app.name, "test-app");
  assert.equal(calls[0].options.provider.siteKey, "site-key");
  assert.equal(calls[0].options.isTokenAutoRefreshEnabled, true);
});
