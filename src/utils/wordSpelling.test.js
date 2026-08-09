import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateSpellingAccuracy,
  calculateSpellingAttemptScore,
  createSpellingMask,
  isSpellingAnswerCorrect,
  normalizeSpellingItems,
} from "./wordSpelling.js";

test("normalizes spelling items and answers", () => {
  const items = normalizeSpellingItems([
    { id: "1", word: "  Ice  Cream ", meaning: "아이스크림" },
    { id: "2", word: "", meaning: "비어 있음" },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].normalizedWord, "ice cream");
  assert.equal(isSpellingAnswerCorrect(" ICE   CREAM ", "ice cream"), true);
});

test("calculates the fixed spelling attempt scores", () => {
  assert.equal(calculateSpellingAttemptScore({ attemptsUsed: 1 }), 100);
  assert.equal(calculateSpellingAttemptScore({ attemptsUsed: 2 }), 70);
  assert.equal(calculateSpellingAttemptScore({ attemptsUsed: 3 }), 40);
  assert.equal(calculateSpellingAttemptScore({ attemptsUsed: 3, revealed: true }), 10);
});

test("calculates accuracy from completed questions", () => {
  assert.equal(calculateSpellingAccuracy(2, 3), 67);
  assert.equal(calculateSpellingAccuracy(0, 0), 0);
});

test("shows an internal clue for long words", () => {
  const mask = createSpellingMask("computer", { random: () => 0.25 });

  assert.equal(mask.visibleIndexes.includes(0), true);
  assert.equal(mask.visibleIndexes.includes(7), true);
  assert.equal(
    mask.visibleIndexes.some((index) => index > 0 && index < 7),
    true,
  );
  assert.equal(mask.characters.filter((character) => character.visible).length, 3);
});

test("uses the configured clue count for short and medium words", () => {
  assert.equal(
    createSpellingMask("cat", { random: () => 0 }).visibleIndexes.length,
    1,
  );
  assert.equal(
    createSpellingMask("apple", { random: () => 0 }).visibleIndexes.length,
    2,
  );
  assert.equal(
    createSpellingMask("responsibility", { random: () => 0 }).visibleIndexes.length,
    4,
  );
});

test("avoids a used mask signature when another pattern exists", () => {
  const usedSignatures = new Set();
  const first = createSpellingMask("computer", {
    usedSignatures,
    random: () => 0,
  });
  usedSignatures.add(first.signature);

  const second = createSpellingMask("computer", {
    usedSignatures,
    random: () => 0,
  });

  assert.notEqual(second.signature, first.signature);
});

test("keeps separators visible in the display text", () => {
  const mask = createSpellingMask("ice-cream", { random: () => 0 });

  assert.equal(mask.characters[3].separator, true);
  assert.equal(mask.characters[3].visible, true);
  assert.equal(mask.displayText.includes("-"), true);
  assert.equal(mask.displayText, mask.displayText.toLowerCase());
});
