import test from "node:test";
import assert from "node:assert/strict";
import {
  getTeacherActivityLeaderboardDefinition,
  summarizeTeacherLeaderboardOutcome,
} from "./teacherLeaderboards.js";

test("getTeacherActivityLeaderboardDefinition returns the typing definition", () => {
  const definition = getTeacherActivityLeaderboardDefinition("typing");

  assert.deepEqual(definition, {
    type: "typing",
    label: "영어 타자",
    collectionName: "typingLeaderboards",
  });
});

test("summarizeTeacherLeaderboardOutcome joins localized period labels", () => {
  const summary = summarizeTeacherLeaderboardOutcome(
    ["week", "school_all"],
    "수정",
  );

  assert.equal(summary, "주간, 학교 전체 수정");
});

test("summarizeTeacherLeaderboardOutcome returns an empty string for empty periods", () => {
  assert.equal(summarizeTeacherLeaderboardOutcome([], "삭제"), "");
});
