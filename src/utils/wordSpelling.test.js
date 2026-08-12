import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateSpellingAccuracy,
  calculateSpellingAttemptScore,
  createSpellingMask,
  createSpellingQuestions,
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

test("keeps one-letter words fully hidden", () => {
  const mask = createSpellingMask("I", { random: () => 0 });

  assert.deepEqual(mask.visibleIndexes, []);
  assert.equal(mask.displayText, "_");
  assert.equal(mask.characters[0].visible, false);
});

test("keeps mask history across a second game for the same item set", () => {
  const usedMasksByWord = new Map();
  const items = normalizeSpellingItems([
    { id: "computer", word: "computer", meaning: "컴퓨터" },
  ]);

  const firstGame = createSpellingQuestions(items, {
    usedMasksByWord,
    random: () => 0,
  });
  const secondGame = createSpellingQuestions(items, {
    usedMasksByWord,
    random: () => 0,
  });

  assert.notEqual(firstGame[0].mask.signature, secondGame[0].mask.signature);
  assert.equal(secondGame[0].word, items[0].word);
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

test("avoids the immediately previous mask when the candidate pool is exhausted", () => {
  const discoveryUsedSignatures = new Set();
  const candidateSignatures = [];

  for (let index = 0; index < 3; index += 1) {
    const mask = createSpellingMask("cat", {
      usedSignatures: discoveryUsedSignatures,
      random: () => 0,
    });
    candidateSignatures.push(mask.signature);
    discoveryUsedSignatures.add(mask.signature);
  }

  const usedSignatures = new Set([
    candidateSignatures[0],
    candidateSignatures[2],
    candidateSignatures[1],
  ]);
  const fallback = createSpellingMask("cat", {
    usedSignatures,
    random: () => 0,
  });

  assert.equal(candidateSignatures.length, 3);
  assert.equal([...usedSignatures].at(-1), candidateSignatures[1]);
  assert.notEqual(fallback.signature, candidateSignatures[1]);
});

test("keeps separators visible in the display text", () => {
  const mask = createSpellingMask("ice-cream", { random: () => 0 });

  assert.equal(mask.characters[3].separator, true);
  assert.equal(mask.characters[3].visible, true);
  assert.equal(mask.displayText.includes("-"), true);
  assert.equal(mask.displayText, mask.displayText.toLowerCase());
});
