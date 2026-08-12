import test from "node:test";
import assert from "node:assert/strict";
import {
  formatTeacherLeaderboardEntryDetail,
  getTeacherActivityLeaderboardDefinition,
} from "./teacherLeaderboardView.js";

test("getTeacherActivityLeaderboardDefinition returns the custom typing definition", () => {
  const definition = getTeacherActivityLeaderboardDefinition("typing");

  assert.deepEqual(definition, {
    type: "typing",
    label: "영어 타자",
    collectionName: "typingLeaderboards",
  });
});

test("formatTeacherLeaderboardEntryDetail includes typing-specific metrics", () => {
  const detail = formatTeacherLeaderboardEntryDetail(
    {
      elapsedSeconds: 42,
      correctCount: 9,
      questionCount: 10,
      accuracy: 92.5,
      hintUsedCount: 1,
      bestCombo: 4,
    },
    "typing",
    "week",
  );

  assert.equal(
    detail,
    "00:42 · 정답 9/10 · 정확도 92.5% · 힌트 1회 · 최고 4콤보",
  );
});

test("formatTeacherLeaderboardEntryDetail includes spelling-specific metrics", () => {
  const detail = formatTeacherLeaderboardEntryDetail(
    {
      elapsedSeconds: 42,
      correctCount: 9,
      questionCount: 10,
      revealedCount: 1,
      totalAttempts: 12,
    },
    "spelling",
    "week",
  );

  assert.equal(detail, "00:42 · 정답 9/10 · 공개 1회 · 시도 12회");
});

test("formatTeacherLeaderboardEntryDetail prepends grade for school-wide matching boards", () => {
  const detail = formatTeacherLeaderboardEntryDetail(
    {
      grade: "3",
      elapsedSeconds: 55,
      solvedPairs: 8,
    },
    "matching",
    "school_all",
  );

  assert.equal(detail, "3학년 · 00:55 · 짝 8개");
});
