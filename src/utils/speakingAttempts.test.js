import test from "node:test";
import assert from "node:assert/strict";
import {
  canAdvanceSpeakingQuestion,
  getSpeechRecognitionEndFallbackError,
  shouldCountSpeechRecognitionErrorAsAttempt,
  SPEAKING_ADVANCE_FAILURE_LIMIT,
} from "./speakingAttempts.js";

test("canAdvanceSpeakingQuestion unlocks after three combined failed attempts", () => {
  assert.equal(
    canAdvanceSpeakingQuestion({
      status: "incorrect",
      failedAttempts: SPEAKING_ADVANCE_FAILURE_LIMIT,
      blockingError: "",
    }),
    true,
  );
});

test("shouldCountSpeechRecognitionErrorAsAttempt includes retryable STT failures", () => {
  assert.equal(shouldCountSpeechRecognitionErrorAsAttempt("no-speech"), true);
  assert.equal(shouldCountSpeechRecognitionErrorAsAttempt("no-match"), true);
  assert.equal(shouldCountSpeechRecognitionErrorAsAttempt("aborted"), true);
  assert.equal(shouldCountSpeechRecognitionErrorAsAttempt("speech-recognition-error"), true);
});

test("shouldCountSpeechRecognitionErrorAsAttempt excludes configuration errors", () => {
  assert.equal(shouldCountSpeechRecognitionErrorAsAttempt("microphone-permission-denied"), false);
  assert.equal(shouldCountSpeechRecognitionErrorAsAttempt("microphone-device-missing"), false);
  assert.equal(shouldCountSpeechRecognitionErrorAsAttempt("speech-recognition-network-error"), false);
});

test("getSpeechRecognitionEndFallbackError treats an ended attempt with no result as no-speech", () => {
  assert.equal(
    getSpeechRecognitionEndFallbackError({
      stopRequested: false,
      resultReceived: false,
      errorReceived: false,
    }),
    "no-speech",
  );
});

test("getSpeechRecognitionEndFallbackError ignores intentional stops and completed attempts", () => {
  assert.equal(
    getSpeechRecognitionEndFallbackError({
      stopRequested: true,
      resultReceived: false,
      errorReceived: false,
    }),
    "",
  );
  assert.equal(
    getSpeechRecognitionEndFallbackError({
      stopRequested: false,
      resultReceived: true,
      errorReceived: false,
    }),
    "",
  );
  assert.equal(
    getSpeechRecognitionEndFallbackError({
      stopRequested: false,
      resultReceived: false,
      errorReceived: true,
    }),
    "",
  );
});
