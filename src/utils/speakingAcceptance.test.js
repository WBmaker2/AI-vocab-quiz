import test from "node:test";
import assert from "node:assert/strict";
import {
  extractSpeechCandidates,
  isSpeakingAnswerAccepted,
} from "./speakingAcceptance.js";

function result(...transcripts) {
  return transcripts.map((transcript) => ({ transcript }));
}

test("extractSpeechCandidates keeps alternatives separate and caps them at three", () => {
  const event = {
    results: [result("appel", "apple", "apply", "apples")],
  };

  assert.deepEqual(extractSpeechCandidates(event), ["appel", "apple", "apply"]);
  assert.equal(isSpeakingAnswerAccepted(extractSpeechCandidates({ results: [result("ice", "cream")] }), "ice cream"), false);
});

test("extractSpeechCandidates ignores interim result segments", () => {
  const event = {
    results: [
      Object.assign(result("apple", "appel"), { isFinal: false }),
      Object.assign(result("banana", "apple"), { isFinal: true }),
    ],
  };

  assert.deepEqual(extractSpeechCandidates(event), ["banana", "apple"]);
});

test("exact primary candidate is accepted", () => {
  assert.equal(isSpeakingAnswerAccepted(["apple"], "apple"), true);
});

test("exact secondary candidate rescues a conservative close primary candidate", () => {
  assert.equal(isSpeakingAnswerAccepted(["appel"], "apple"), false);
  assert.equal(isSpeakingAnswerAccepted(["appel", "apple"], "apple"), true);
  assert.equal(isSpeakingAnswerAccepted(["fone", "phone"], "phone"), true);
});

test("an exact secondary candidate cannot rescue an unrelated primary candidate", () => {
  assert.equal(isSpeakingAnswerAccepted(["banana", "apple"], "apple"), false);
  assert.equal(isSpeakingAnswerAccepted(["applesauce", "apple"], "apple"), false);
  assert.equal(isSpeakingAnswerAccepted(["ice", "cream"], "ice cream"), false);
});

test("protected confusion pairs and short words stay strict", () => {
  assert.equal(isSpeakingAnswerAccepted(["tree", "three"], "three"), false);
  assert.equal(isSpeakingAnswerAccepted(["sheep", "ship"], "ship"), false);
  assert.equal(isSpeakingAnswerAccepted(["cat", "cut"], "cut"), false);
  assert.equal(isSpeakingAnswerAccepted(["tree cats", "three cats"], "three cats"), false);
  assert.equal(isSpeakingAnswerAccepted(["I said tree cats", "three cats"], "three cats"), false);
  assert.equal(isSpeakingAnswerAccepted(["tree three"], "three"), true);
  assert.equal(isSpeakingAnswerAccepted(["tree I said three cats"], "three cats"), true);
  assert.equal(isSpeakingAnswerAccepted(["three cats"], "three cats"), true);
});

test("different numbers stay rejected while existing whole-word wrappers remain valid", () => {
  assert.equal(isSpeakingAnswerAccepted(["thirteen", "thirty"], "thirty"), false);
  assert.equal(isSpeakingAnswerAccepted(["I said apple"], "apple"), true);
  assert.equal(isSpeakingAnswerAccepted(["I said tree", "three"], "three"), false);
});

test("a reset-style empty candidate list cannot reuse an earlier answer", () => {
  assert.equal(isSpeakingAnswerAccepted([], "apple"), false);
  assert.equal(isSpeakingAnswerAccepted(undefined, "apple"), false);
});
