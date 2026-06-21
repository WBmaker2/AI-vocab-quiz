import test from "node:test";
import assert from "node:assert/strict";
import {
  isSpeechMatch,
  normalizeSpeechNumberText,
  normalizeSpeechText,
} from "./normalize.js";

test("normalizeSpeechText keeps digit transcripts for speech matching", () => {
  assert.equal(normalizeSpeechText("30"), "30");
});

test("normalizeSpeechNumberText converts common number words to digits", () => {
  assert.equal(normalizeSpeechNumberText("thirty"), "30");
  assert.equal(normalizeSpeechNumberText("twenty-one"), "21");
  assert.equal(normalizeSpeechNumberText("I said thirty one"), "i said 31");
});

test("isSpeechMatch accepts numeric STT output for spoken number words", () => {
  assert.equal(isSpeechMatch("30", "thirty"), true);
  assert.equal(isSpeechMatch("I said 30", "thirty"), true);
  assert.equal(isSpeechMatch("31", "thirty one"), true);
});

test("isSpeechMatch accepts spoken number words for numeric vocabulary", () => {
  assert.equal(isSpeechMatch("thirty", "30"), true);
});

test("isSpeechMatch does not accept a different number", () => {
  assert.equal(isSpeechMatch("13", "thirty"), false);
  assert.equal(isSpeechMatch("thirty", "thirteen"), false);
});

test("isSpeechMatch keeps the existing word-in-transcript behavior", () => {
  assert.equal(isSpeechMatch("I said apple", "apple"), true);
});
