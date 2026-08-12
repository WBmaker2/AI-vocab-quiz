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

test("ranks spelling ties by correct count, attempts, then elapsed time", () => {
  const winner = pickBetterActivityLeaderboardEntry(
    {
      score: 180,
      correctCount: 2,
      totalAttempts: 6,
      elapsedSeconds: 50,
      revealedCount: 1,
    },
    {
      score: 180,
      correctCount: 2,
      totalAttempts: 7,
      elapsedSeconds: 40,
      revealedCount: 1,
    },
  );

  assert.equal(winner.totalAttempts, 6);
});
