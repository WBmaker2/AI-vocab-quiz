import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateFishingScore,
  createFishingRound,
  FISHING_MAX_ROUNDS,
  FISHING_ROUND_DURATION_MS,
  FISHING_ROUND_DURATION_SECONDS,
} from "./wordFishing.js";

test("fishing round constants stay aligned", () => {
  assert.equal(FISHING_MAX_ROUNDS, 10);
  assert.equal(FISHING_ROUND_DURATION_SECONDS, FISHING_ROUND_DURATION_MS / 1000);
});

test("createFishingRound builds a bounded round with the answer included", () => {
  const items = Array.from({ length: 8 }, (_, index) => ({
    id: `item-${index}`,
    word: `word-${index}`,
    meaning: `뜻-${index}`,
  }));
  const round = createFishingRound(items, [], 6);

  assert.equal(round.candidates.length, 6);
  assert.ok(round.candidates.some((candidate) => candidate.id === round.answer.id));
});

test("faster correct fishing answers earn more points within the same round", () => {
  const veryFast = calculateFishingScore({ isCorrect: true, reactionMs: 1500 });
  const fast = calculateFishingScore({ isCorrect: true, reactionMs: 2500 });
  const medium = calculateFishingScore({ isCorrect: true, reactionMs: 3500 });
  const slow = calculateFishingScore({ isCorrect: true, reactionMs: 9000 });

  assert.ok(veryFast > fast);
  assert.ok(fast > medium);
  assert.ok(medium > slow);
});

test("fishing speed score stays bounded and preserves wrong-answer scoring", () => {
  assert.equal(calculateFishingScore({ isCorrect: true, reactionMs: 0 }), 140);
  assert.equal(calculateFishingScore({ isCorrect: true, reactionMs: 2100 }), 139);
  assert.equal(calculateFishingScore({ isCorrect: true, reactionMs: 10000 }), 100);
  assert.equal(calculateFishingScore({ isCorrect: true, reactionMs: 20000 }), 100);
  assert.equal(calculateFishingScore({ isCorrect: false, reactionMs: 0 }), -30);
});
