import test from "node:test";
import assert from "node:assert/strict";
import {
  createTeacherProfileWriteData,
  shouldReplaceElapsedLeaderboardEntry,
} from "./firebase.js";

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
