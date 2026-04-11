import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateTypingScore,
  normalizeTypingItems,
} from "./wordTyping.js";

test("normalizeTypingItems keeps duplicate word-meaning pairs when source ids differ", () => {
  const items = normalizeTypingItems([
    { id: "item-1", word: "apple", meaning: "사과" },
    { id: "item-2", word: "apple", meaning: "사과" },
    { id: "item-3", word: "banana", meaning: "바나나" },
  ]);

  assert.equal(items.length, 3);
  assert.deepEqual(
    items.map((item) => item.id),
    ["item-1", "item-2", "item-3"],
  );
});

test("calculateTypingScore still awards points for a third-attempt correct answer", () => {
  const score = calculateTypingScore({
    attemptsUsed: 3,
    answerSeconds: 5,
    usedHint: false,
    combo: 1,
  });

  assert.equal(score, 70);
});

test("calculateTypingScore starts combo bonuses at two consecutive correct answers", () => {
  const singleComboScore = calculateTypingScore({
    attemptsUsed: 1,
    answerSeconds: 2,
    usedHint: false,
    combo: 1,
  });
  const doubleComboScore = calculateTypingScore({
    attemptsUsed: 1,
    answerSeconds: 2,
    usedHint: false,
    combo: 2,
  });

  assert.equal(singleComboScore, 116);
  assert.equal(doubleComboScore, 121);
});
