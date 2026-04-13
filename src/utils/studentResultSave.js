export function normalizeStudentResultName(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

export async function saveCombinedStudentResult({
  studentName,
  saveLeaderboard,
  saveProgress,
}) {
  const cleanStudentName = normalizeStudentResultName(studentName);

  if (!cleanStudentName) {
    throw new Error("학생 이름을 입력해 주세요.");
  }

  const leaderboard = await saveLeaderboard(cleanStudentName);

  try {
    const progress = await saveProgress(cleanStudentName);

    return {
      studentName: cleanStudentName,
      leaderboard,
      progress,
      progressError: "",
    };
  } catch (error) {
    return {
      studentName: cleanStudentName,
      leaderboard,
      progress: null,
      progressError: error?.message || "개인 성장 기록 저장은 완료하지 못했습니다.",
    };
  }

}

export function createCombinedStudentResultStatus({
  activityLabel,
  studentName,
  leaderboard,
  progressSaved,
}) {
  const cleanActivityLabel = String(activityLabel ?? "").trim();
  const cleanStudentName = normalizeStudentResultName(studentName);
  const updatedPeriods = Array.isArray(leaderboard?.updatedPeriods)
    ? leaderboard.updatedPeriods
    : [];
  const failedPeriods = Array.isArray(leaderboard?.failedPeriods)
    ? leaderboard.failedPeriods
    : [];

  if (!progressSaved) {
    return `${cleanStudentName} 학생의 리더보드 점수는 저장했지만 개인 성장 기록 저장은 완료하지 못했습니다.`;
  }

  if (failedPeriods.length > 0 && updatedPeriods.length > 0) {
    return `${cleanStudentName} 학생의 ${cleanActivityLabel} 성장 기록을 저장했고, 리더보드는 일부 기간만 반영했습니다.`;
  }

  if (updatedPeriods.length > 0) {
    return `${cleanStudentName} 학생의 ${cleanActivityLabel} 성장 기록과 리더보드 점수를 저장했습니다.`;
  }

  return `${cleanStudentName} 학생의 ${cleanActivityLabel} 성장 기록을 저장했고, 리더보드는 기존 최고 기록을 유지했습니다.`;
}
