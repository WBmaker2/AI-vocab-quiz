import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceMatchingBoard,
  createListeningQuestions,
  isMatchingCompleteAfterMatch,
} from "./quiz.js";

test("createListeningQuestions uses the full pool for distractors when review items are few", () => {
  const reviewItems = [{ id: "1", word: "apple", meaning: "사과" }];
  const allItems = [
    { id: "1", word: "apple", meaning: "사과" },
    { id: "2", word: "banana", meaning: "바나나" },
    { id: "3", word: "cat", meaning: "고양이" },
    { id: "4", word: "dog", meaning: "강아지" },
  ];

  const [question] = createListeningQuestions(reviewItems, allItems);

  assert.equal(question.choices.length, 4);
  assert.ok(question.choices.includes("사과"));
});

test("isMatchingCompleteAfterMatch only completes on the final pair", () => {
  assert.equal(
    isMatchingCompleteAfterMatch({ solvedPairs: 3, totalPairs: 5 }),
    false,
  );
  assert.equal(
    isMatchingCompleteAfterMatch({ solvedPairs: 4, totalPairs: 5 }),
    true,
  );
});

test("advanceMatchingBoard preserves totalPairs for later completion checks", () => {
  const nextState = advanceMatchingBoard({
    totalPairs: 5,
    leftCards: [{ slotId: "left-1" }],
    rightCards: [{ slotId: "right-1" }],
    remainingPairs: [{ id: "2", word: "banana", meaning: "바나나" }],
    leftIndex: 0,
    rightIndex: 0,
  });

  assert.equal(nextState.totalPairs, 5);
  assert.equal(
    isMatchingCompleteAfterMatch({
      solvedPairs: 4,
      totalPairs: nextState.totalPairs,
    }),
    true,
  );
});
