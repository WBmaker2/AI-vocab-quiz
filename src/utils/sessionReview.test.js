import test from "node:test";
import assert from "node:assert/strict";
import {
  createSessionReviewKey,
  registerSessionReviewMiss,
  buildSessionReviewItems,
} from "./sessionReview.js";

test("createSessionReviewKey normalizes the word but preserves the meaning", () => {
  assert.equal(
    createSessionReviewKey({
      word: " Apple ",
      meaning: "사과",
    }),
    "apple__사과",
  );
});

test("registerSessionReviewMiss dedupes by word and meaning", () => {
  const first = registerSessionReviewMiss(
    [],
    {
      id: "1",
      word: "apple",
      meaning: "사과",
    },
    "listening",
    10,
  );
  const second = registerSessionReviewMiss(
    first,
    {
      id: "2",
      word: "apple",
      meaning: "사과",
    },
    "listening",
    20,
  );

  assert.equal(second.length, 1);
  assert.equal(second[0].wrongCount, 2);
  assert.equal(second[0].lastWrongAt, 20);
});

test("buildSessionReviewItems prioritizes higher wrongCount then later miss", () => {
  const items = buildSessionReviewItems(
    [
      { reviewKey: "a", wrongCount: 1, lastWrongAt: 10 },
      { reviewKey: "b", wrongCount: 3, lastWrongAt: 5 },
      { reviewKey: "c", wrongCount: 3, lastWrongAt: 20 },
    ],
    2,
  );

  assert.deepEqual(items.map((item) => item.reviewKey), ["c", "b"]);
});
