import test from "node:test";
import assert from "node:assert/strict";
import { calculateFishingScore } from "./wordFishing.js";

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
