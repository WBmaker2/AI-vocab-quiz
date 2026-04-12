import test from "node:test";
import assert from "node:assert/strict";
import { getAppChromeLayout } from "./appChrome.js";

test("getAppChromeLayout keeps the home screen hero fully expanded", () => {
  assert.deepEqual(getAppChromeLayout("home"), {
    heroVariant: "full",
    showSupportNotice: true,
  });
});

test("getAppChromeLayout compacts the teacher screen chrome", () => {
  assert.deepEqual(getAppChromeLayout("teacher"), {
    heroVariant: "compact",
    showSupportNotice: false,
  });
});
