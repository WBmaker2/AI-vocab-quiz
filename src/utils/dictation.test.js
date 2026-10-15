import test from "node:test";
import assert from "node:assert/strict";
import { createDictationSequence, gradeDictationAnswer } from "./dictation.js";

test("grades exact spelling as correct", () => {
  assert.equal(gradeDictationAnswer("apple", "apple"), true);
  assert.equal(gradeDictationAnswer("Apple", "apple"), true);
  assert.equal(gradeDictationAnswer("tshirt", "t-shirt"), true);
});

test("rejects wrong spelling and empty input", () => {
  assert.equal(gradeDictationAnswer("aple", "apple"), false);
  assert.equal(gradeDictationAnswer("", "apple"), false);
  assert.equal(gradeDictationAnswer("apples", "apple"), false);
});

test("creates a sequence only from items with words", () => {
  const sequence = createDictationSequence([
    { id: "1", word: "apple", meaning: "사과" },
    { id: "2", word: "", meaning: "빈값" },
  ]);
  assert.equal(sequence.length, 1);
  assert.equal(sequence[0].word, "apple");
});
