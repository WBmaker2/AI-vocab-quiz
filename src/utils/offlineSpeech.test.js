import test from "node:test";
import assert from "node:assert/strict";
import {
  OFFLINE_STT_LIBRARY_URL,
  OFFLINE_STT_MAX_RECORD_MS,
  OFFLINE_STT_MODEL_ID,
  isOfflineRecordingSupported,
  resolveRecordingMimeType,
} from "./offlineSpeech.js";

test("exposes the pinned tiny english model", () => {
  assert.equal(OFFLINE_STT_MODEL_ID, "Xenova/whisper-tiny.en");
  assert.equal(OFFLINE_STT_MAX_RECORD_MS, 8000);
  assert.equal(OFFLINE_STT_LIBRARY_URL, "https://esm.sh/@xenova/transformers@2.17.2");
});

test("returns empty mime type without a recorder", () => {
  assert.equal(resolveRecordingMimeType(null), "");
  assert.equal(
    resolveRecordingMimeType({ isTypeSupported: () => { throw new Error("x"); } }),
    "",
  );
});

test("picks the first supported mime type", () => {
  const fake = { isTypeSupported: (mime) => mime === "audio/mp4" };
  assert.equal(resolveRecordingMimeType(fake), "audio/mp4");
});

test("reports unsupported recording in node", () => {
  assert.equal(isOfflineRecordingSupported(), false);
});
