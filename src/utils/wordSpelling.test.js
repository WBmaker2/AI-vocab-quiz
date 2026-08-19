import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateSpellingAccuracy,
  calculateSpellingAttemptScore,
  createSpellingMask,
  createSpellingQuestions,
  createSpellingHintState,
  isSpellingNextQuestionShortcut,
  isSpellingAnswerRevealed,
  isSpellingAnswerCorrect,
  normalizeSpellingItems,
  revealNextSpellingHint,
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

test("recognizes only a fresh non-composing Enter as the next-question shortcut", () => {
  assert.equal(isSpellingNextQuestionShortcut({ key: "Enter" }), true);
  assert.equal(isSpellingNextQuestionShortcut({ key: "Enter", isComposing: true }), false);
  assert.equal(isSpellingNextQuestionShortcut({ key: "Enter", repeat: true }), false);
  assert.equal(isSpellingNextQuestionShortcut({ key: "Space" }), false);
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
  const lastSignatureByWord = new Map();
  const items = normalizeSpellingItems([
    { id: "computer", word: "computer", meaning: "컴퓨터" },
  ]);

  const firstGame = createSpellingQuestions(items, {
    usedMasksByWord,
    lastSignatureByWord,
    random: () => 0,
  });
  const secondGame = createSpellingQuestions(items, {
    usedMasksByWord,
    lastSignatureByWord,
    random: () => 0,
  });

  assert.notEqual(firstGame[0].mask.signature, secondGame[0].mask.signature);
  assert.equal(secondGame[0].word, items[0].word);
});

test("does not repeat the previous mask after deterministic candidate exhaustion", () => {
  const usedMasksByWord = new Map();
  const lastSignatureByWord = new Map();
  const items = normalizeSpellingItems([
    { id: "cat", word: "cat", meaning: "고양이" },
  ]);
  const signatures = Array.from({ length: 8 }, () => createSpellingQuestions(items, {
    usedMasksByWord,
    lastSignatureByWord,
    random: () => 0,
  })[0].mask.signature);

  assert.equal(usedMasksByWord.get("cat").size, 3);
  for (let index = 1; index < signatures.length; index += 1) {
    assert.notEqual(signatures[index], signatures[index - 1]);
  }
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

test("reveals spelling hints in helpful stages without changing separators", () => {
  const item = normalizeSpellingItems([
    { id: "breakfast", word: "breakfast", meaning: "아침 식사" },
  ])[0];
  const question = {
    ...item,
    mask: createSpellingMask(item.word, { random: () => 0 }),
  };
  const initial = createSpellingHintState(question);
  const first = revealNextSpellingHint(question, initial);
  const second = revealNextSpellingHint(question, first);

  assert.equal(initial.level, 0);
  assert.equal(first.level, 1);
  assert.equal(second.level, 2);
  assert.ok(first.characters.filter((character) => character.visible).length >
    initial.characters.filter((character) => character.visible).length);
  assert.ok(second.characters.filter((character) => character.visible).length >
    first.characters.filter((character) => character.visible).length);
  assert.equal(first.displayText, first.displayText.toLowerCase());
  assert.equal(first.hintLabel, "한 칸 더 보여줘");
});

test("finishes the spelling hint ladder with a full answer state", () => {
  const item = normalizeSpellingItems([
    { id: "ice-cream", word: "ice-cream", meaning: "아이스크림" },
  ])[0];
  const question = {
    ...item,
    mask: createSpellingMask(item.word, { random: () => 0 }),
  };
  let hintState = createSpellingHintState(question);

  while (!isSpellingAnswerRevealed(hintState)) {
    hintState = revealNextSpellingHint(question, hintState);
  }

  assert.equal(hintState.displayText, "ice-cream");
  assert.equal(hintState.characters[3].separator, true);
  assert.equal(hintState.characters[3].visible, true);
  assert.equal(hintState.hintLabel, "정답 보고 따라 쓰기");
});
