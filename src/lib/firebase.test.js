import test from "node:test";
import assert from "node:assert/strict";
import {
  createTeacherProfileWriteData,
  shouldReplaceElapsedLeaderboardEntry,
  validateFishingLeaderboardResult,
  validateMatchingLeaderboardResult,
  validateTypingLeaderboardResult,
} from "./firebase.js";
import * as firebase from "./firebase.js";

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

test("createTeacherProfileWriteData creates pending profiles without client activation", () => {
  assert.deepEqual(
    createTeacherProfileWriteData({
      teacherName: " 김선생 ",
      schoolId: "school-1",
      schoolName: " 테스트초 ",
      gradePublishers: { 3: "천재" },
      isNew: true,
    }),
    {
      teacherName: "김선생",
      schoolId: "school-1",
      schoolName: "테스트초",
      isActive: false,
      gradePublishers: { 3: "천재" },
    },
  );
});

test("createTeacherProfileWriteData updates only self-service profile fields", () => {
  assert.deepEqual(
    createTeacherProfileWriteData({
      teacherName: " 김새선생 ",
      schoolId: "school-2",
      schoolName: " 다른초 ",
      gradePublishers: { 4: "비상" },
      isNew: false,
    }),
    {
      teacherName: "김새선생",
      gradePublishers: { 4: "비상" },
    },
  );
});

test("leaderboard result validators accept representative bounded scores", () => {
  assert.deepEqual(
    validateMatchingLeaderboardResult({ score: 800, elapsedSeconds: 45, solvedPairs: 8 }),
    { score: 800, elapsedSeconds: 45, solvedPairs: 8 },
  );
  assert.deepEqual(
    validateFishingLeaderboardResult({
      score: 980,
      elapsedSeconds: 45,
      correctCount: 7,
      wrongCount: 2,
      missCount: 1,
    }),
    { score: 980, elapsedSeconds: 45, correctCount: 7, wrongCount: 2, missCount: 1 },
  );
  assert.deepEqual(
    validateTypingLeaderboardResult({
      score: 1120,
      elapsedSeconds: 75,
      questionCount: 10,
      correctCount: 8,
      accuracy: 80,
      hintUsedCount: 2,
      bestCombo: 6,
    }),
    {
      score: 1120,
      elapsedSeconds: 75,
      questionCount: 10,
      correctCount: 8,
      accuracy: 80,
      hintUsedCount: 2,
      bestCombo: 6,
    },
  );
});

test("leaderboard result validators reject impossible scores and invalid bounds", () => {
  assert.throws(
    () => validateMatchingLeaderboardResult({ score: 801, elapsedSeconds: 45, solvedPairs: 8 }),
    /score/i,
  );
  assert.throws(
    () => validateFishingLeaderboardResult({
      score: 981,
      elapsedSeconds: 45,
      correctCount: 7,
      wrongCount: 2,
      missCount: 1,
    }), /score/i);
  assert.throws(
    () => validateTypingLeaderboardResult({
      score: 1121,
      elapsedSeconds: 75,
      questionCount: 10,
      correctCount: 8,
      accuracy: 80,
      hintUsedCount: 2,
      bestCombo: 6,
    }), /score/i);
  assert.throws(
    () => validateTypingLeaderboardResult({
      score: 560,
      elapsedSeconds: 75,
      questionCount: 7,
      correctCount: 4,
      accuracy: 100,
      hintUsedCount: 2,
      bestCombo: 4,
    }), /accuracy/i);
});

test("saveTeacherVocabularyImportBatch rejects more than 500 operations before Firebase writes", async () => {
  const vocabularySets = Array.from({ length: 500 }, (_, index) => ({
    unit: String(index + 1),
    items: [],
  }));
  const result = await Promise.resolve()
    .then(() =>
      firebase.saveTeacherVocabularyImportBatch({
        userId: "teacher-1",
        teacherProfile: {
          teacherName: "김선생",
          schoolId: "school-1",
          schoolName: "테스트초",
        },
        grade: "3",
        publisher: "천재교육",
        gradePublishers: { 3: "천재교육" },
        published: false,
        vocabularySets,
      }),
    )
    .catch((error) => error);

  assert.match(result?.message ?? "", /500/);
});
