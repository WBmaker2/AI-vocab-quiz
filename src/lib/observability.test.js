import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  buildErrorPayload,
  reportClientError,
  resetObservabilityForTests,
  shouldReportEvent,
} from "./observability.js";

beforeEach(() => {
  resetObservabilityForTests();
});

test("buildErrorPayload includes release and context metadata", () => {
  const payload = buildErrorPayload(
    { name: "FirebaseError", code: "permission-denied", message: "Denied", stack: "stack" },
    { view: "fishing" },
    { now: 1_700_000_000_000, url: "https://example.test", userAgent: "test-agent" },
  );

  assert.equal(payload.type, "error");
  assert.equal(payload.code, "permission-denied");
  assert.equal(payload.context.view, "fishing");
  assert.equal(payload.url, "https://example.test");
  assert.equal(payload.userAgent, "test-agent");
  assert.match(payload.timestamp, /^2023-/);
});

test("shouldReportEvent deduplicates and rate limits events", () => {
  assert.equal(shouldReportEvent("same-key", { now: 1000 }), true);
  assert.equal(shouldReportEvent("same-key", { now: 1001 }), false);
  assert.equal(shouldReportEvent("another-key", { now: 1002 }), true);
  assert.equal(
    shouldReportEvent("third-key", { now: 1003, maxEvents: 2 }),
    false,
  );
});

test("reportClientError sends errors through an injected Sentry client", () => {
  const captured = [];
  const sentry = {
    captureException(error, options) {
      captured.push({ error, options });
    },
  };

  const payload = reportClientError(
    new Error("boom"),
    { view: "typing" },
    { sentry, reportUrl: "" },
  );

  assert.equal(payload.message, "boom");
  assert.equal(captured.length, 1);
  assert.equal(captured[0].error.message, "boom");
});
