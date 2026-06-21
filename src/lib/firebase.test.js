import test from "node:test";
import assert from "node:assert/strict";
import { shouldReplaceElapsedLeaderboardEntry } from "./firebase.js";

test("shouldReplaceElapsedLeaderboardEntry updates when the existing score is lower", () => {
  assert.equal(
    shouldReplaceElapsedLeaderboardEntry({
      nextScore: 900,
      nextElapsedSeconds: 40,
      existingScore: 850,
      existingElapsedSeconds: 20,
    }),
    true,
  );
});

test("shouldReplaceElapsedLeaderboardEntry updates tied score when elapsed time is faster", () => {
  assert.equal(
    shouldReplaceElapsedLeaderboardEntry({
      nextScore: 900,
      nextElapsedSeconds: 35,
      existingScore: 900,
      existingElapsedSeconds: 36,
    }),
    true,
  );
});

test("shouldReplaceElapsedLeaderboardEntry skips tied score when elapsed time is equal or slower", () => {
  assert.equal(
    shouldReplaceElapsedLeaderboardEntry({
      nextScore: 900,
      nextElapsedSeconds: 36,
      existingScore: 900,
      existingElapsedSeconds: 36,
    }),
    false,
  );
  assert.equal(
    shouldReplaceElapsedLeaderboardEntry({
      nextScore: 900,
      nextElapsedSeconds: 37,
      existingScore: 900,
      existingElapsedSeconds: 36,
    }),
    false,
  );
});

test("shouldReplaceElapsedLeaderboardEntry skips lower score even when elapsed time is faster", () => {
  assert.equal(
    shouldReplaceElapsedLeaderboardEntry({
      nextScore: 899,
      nextElapsedSeconds: 10,
      existingScore: 900,
      existingElapsedSeconds: 36,
    }),
    false,
  );
});
