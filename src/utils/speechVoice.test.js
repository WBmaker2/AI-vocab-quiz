import test from "node:test";
import assert from "node:assert/strict";
import {
  isSpeechRatePreset,
  pickPreferredSpeechVoice,
  resolvePreferredSpeechVoice,
  resolveSpeechRate,
} from "./speechVoice.js";

test("resolves known presets and falls back to standard", () => {
  assert.equal(resolveSpeechRate("slow"), 0.7);
  assert.equal(resolveSpeechRate("standard"), 0.9);
  assert.equal(resolveSpeechRate("unknown"), 0.9);
  assert.equal(isSpeechRatePreset("slow"), true);
  assert.equal(isSpeechRatePreset("fast"), false);
});

test("picks Google US English first", () => {
  const voices = [
    { name: "Samantha", lang: "en-US", voiceURI: "samantha" },
    { name: "Google US English", lang: "en-US", voiceURI: "google-us" },
    { name: "Google UK English Female", lang: "en-GB", voiceURI: "google-uk" },
  ];

  assert.equal(pickPreferredSpeechVoice(voices)?.voiceURI, "google-us");
});

test("returns null when no English voice exists", () => {
  assert.equal(pickPreferredSpeechVoice([]), null);
  assert.equal(
    pickPreferredSpeechVoice([{ name: "Yuna", lang: "ko-KR", voiceURI: "yuna" }]),
    null,
  );
});

test("prefers the stored voice URI when it is still available", () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
  };

  try {
    store.set("ttsPreferredVoice.v1", "samantha");
    const voices = [
      { name: "Google US English", lang: "en-US", voiceURI: "google-us" },
      { name: "Samantha", lang: "en-US", voiceURI: "samantha" },
    ];

    assert.equal(resolvePreferredSpeechVoice(voices)?.voiceURI, "samantha");
  } finally {
    delete globalThis.localStorage;
  }
});
