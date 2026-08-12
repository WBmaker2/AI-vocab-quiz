import test from "node:test";
import assert from "node:assert/strict";
import {
  ACTIVITY_LEADERBOARD_DEFINITIONS,
  getActivityLeaderboardDefinition,
  pickBetterActivityLeaderboardEntry,
} from "./activityLeaderboard.js";

test("registers spelling as an independent leaderboard activity", () => {
  assert.deepEqual(getActivityLeaderboardDefinition("spelling"), {
    type: "spelling",
    label: "철자 완성",
    collectionName: "spellingLeaderboards",
  });
  assert.deepEqual(
    ACTIVITY_LEADERBOARD_DEFINITIONS.map((definition) => definition.type),
    ["matching", "fishing", "spelling", "typing"],
  );
});

test("ranks spelling ties by the complete requested tie order", () => {
  const cases = [
    {
      name: "score descending",
      left: { score: 180, correctCount: 5, totalAttempts: 5, elapsedSeconds: 20 },
      right: { score: 200, correctCount: 1, totalAttempts: 9, elapsedSeconds: 40 },
      expected: "right",
    },
    {
      name: "correct count descending",
      left: { score: 180, correctCount: 2, totalAttempts: 8, elapsedSeconds: 40 },
      right: { score: 180, correctCount: 3, totalAttempts: 9, elapsedSeconds: 50 },
      expected: "right",
    },
    {
      name: "total attempts ascending",
      left: { score: 180, correctCount: 2, totalAttempts: 6, elapsedSeconds: 50 },
      right: { score: 180, correctCount: 2, totalAttempts: 7, elapsedSeconds: 40 },
      expected: "left",
    },
    {
      name: "elapsed time ascending",
      left: { score: 180, correctCount: 2, totalAttempts: 6, elapsedSeconds: 50 },
      right: { score: 180, correctCount: 2, totalAttempts: 6, elapsedSeconds: 40 },
      expected: "right",
    },
    {
      name: "updated time descending",
      left: {
        score: 180,
        correctCount: 2,
        totalAttempts: 6,
        elapsedSeconds: 40,
        updatedAt: { seconds: 10 },
      },
      right: {
        score: 180,
        correctCount: 2,
        totalAttempts: 6,
        elapsedSeconds: 40,
        updatedAt: { seconds: 20 },
      },
      expected: "right",
    },
  ];

  for (const { name, left, right, expected } of cases) {
    assert.equal(
      pickBetterActivityLeaderboardEntry(left, right),
      expected === "left" ? left : right,
      name,
    );
  }
});

test("preserves matching and typing comparison behavior", () => {
  const matchingWinner = pickBetterActivityLeaderboardEntry(
    { score: 800, elapsedSeconds: 45 },
    { score: 800, elapsedSeconds: 40 },
  );
  const typingWinner = pickBetterActivityLeaderboardEntry(
    { score: 180, accuracy: 80, bestCombo: 5, elapsedSeconds: 20 },
    { score: 180, accuracy: 90, bestCombo: 1, elapsedSeconds: 30 },
  );

  assert.equal(matchingWinner.elapsedSeconds, 40);
  assert.equal(typingWinner.accuracy, 90);
});
