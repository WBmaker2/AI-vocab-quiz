import test from "node:test";
import assert from "node:assert/strict";
import { createListeningQuestions } from "./quiz.js";

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
