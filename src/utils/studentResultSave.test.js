import test from "node:test";
import assert from "node:assert/strict";
import {
  createCombinedStudentResultStatus,
  saveCombinedStudentResult,
} from "./studentResultSave.js";

test("saveCombinedStudentResult normalizes the student name and saves leaderboard before progress", async () => {
  const callOrder = [];

  const result = await saveCombinedStudentResult({
    studentName: "  김  홍년  ",
    saveLeaderboard: async (studentName) => {
      callOrder.push(`leaderboard:${studentName}`);
      return {
        updatedPeriods: ["week"],
        skippedPeriods: [],
        failedPeriods: [],
      };
    },
    saveProgress: async (studentName) => {
      callOrder.push(`progress:${studentName}`);
      return {
        comparison: { isNewBest: true },
        newlyEarnedBadges: ["typing_starter"],
      };
    },
  });

  assert.deepEqual(callOrder, ["leaderboard:김 홍년", "progress:김 홍년"]);
  assert.equal(result.studentName, "김 홍년");
  assert.deepEqual(result.leaderboard.updatedPeriods, ["week"]);
  assert.deepEqual(result.progress.newlyEarnedBadges, ["typing_starter"]);
});

test("createCombinedStudentResultStatus summarizes a full save with leaderboard updates", () => {
  const status = createCombinedStudentResultStatus({
    activityLabel: "영어 타자",
    studentName: "김홍년",
    leaderboard: {
      updatedPeriods: ["week", "month"],
      skippedPeriods: [],
      failedPeriods: [],
    },
    progressSaved: true,
  });

  assert.equal(
    status,
    "김홍년 학생의 영어 타자 성장 기록과 리더보드 점수를 저장했습니다.",
  );
});

test("createCombinedStudentResultStatus warns when leaderboard saved but progress did not", () => {
  const status = createCombinedStudentResultStatus({
    activityLabel: "짝 맞추기",
    studentName: "김홍년",
    leaderboard: {
      updatedPeriods: ["week"],
      skippedPeriods: [],
      failedPeriods: [],
    },
    progressSaved: false,
  });

  assert.equal(
    status,
    "김홍년 학생의 리더보드 점수는 저장했지만 개인 성장 기록 저장은 완료하지 못했습니다.",
  );
});

test("saveCombinedStudentResult keeps the leaderboard result when progress saving fails", async () => {
  const result = await saveCombinedStudentResult({
    studentName: "김홍년",
    saveLeaderboard: async () => ({
      updatedPeriods: ["week"],
      skippedPeriods: [],
      failedPeriods: [],
    }),
    saveProgress: async () => {
      throw new Error("개인 기록 저장 실패");
    },
  });

  assert.deepEqual(result.leaderboard.updatedPeriods, ["week"]);
  assert.equal(result.progress, null);
  assert.equal(result.progressError, "개인 기록 저장 실패");
});
