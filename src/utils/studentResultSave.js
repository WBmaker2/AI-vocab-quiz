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
  let leaderboard = null;
  let progress = null;
  let leaderboardError = "";
  let progressError = "";

  if (!cleanStudentName) {
    throw new Error("학생 이름을 입력해 주세요.");
  }

  try {
    leaderboard = await saveLeaderboard(cleanStudentName);
  } catch (error) {
    leaderboardError = error?.message || "리더보드 점수 저장은 완료하지 못했습니다.";
  }

  try {
    progress = await saveProgress(cleanStudentName);
  } catch (error) {
    progressError = error?.message || "개인 성장 기록 저장은 완료하지 못했습니다.";
  }

  if (!leaderboard && !progress) {
    const combinedMessage = [leaderboardError, progressError]
      .filter(Boolean)
      .join(" / ");

    throw new Error(
      combinedMessage || "개인 기록과 리더보드 저장에 모두 실패했습니다.",
    );
  }

  return {
    studentName: cleanStudentName,
    leaderboard,
    leaderboardError,
    progress,
    progressError,
  };
}

export function createCombinedStudentResultStatus({
  activityLabel,
  studentName,
  leaderboard,
  progressSaved,
  progress,
  leaderboardError,
  progressError,
}) {
  const cleanActivityLabel = String(activityLabel ?? "").trim();
  const cleanStudentName = normalizeStudentResultName(studentName);
  const didProgressSave = typeof progressSaved === "boolean"
    ? progressSaved
    : Boolean(progress);
  const hasLeaderboard = Boolean(leaderboard);
  const updatedPeriods = Array.isArray(leaderboard?.updatedPeriods)
    ? leaderboard.updatedPeriods
    : [];
  const failedPeriods = Array.isArray(leaderboard?.failedPeriods)
    ? leaderboard.failedPeriods
    : [];
  const skippedPeriods = Array.isArray(leaderboard?.skippedPeriods)
    ? leaderboard.skippedPeriods
    : [];

  if (didProgressSave && hasLeaderboard && failedPeriods.length > 0) {
    return `${cleanStudentName} 학생의 ${cleanActivityLabel} 성장 기록을 저장했고, 리더보드는 일부 기간만 반영했습니다.`;
  }

  if (didProgressSave && (leaderboardError || !hasLeaderboard)) {
    return `${cleanStudentName} 학생의 ${cleanActivityLabel} 성장 기록을 저장했고, 리더보드는 반영하지 못했습니다.`;
  }

  if (!didProgressSave && hasLeaderboard) {
    return `${cleanStudentName} 학생의 리더보드 점수는 저장했지만 개인 성장 기록 저장은 완료하지 못했습니다.`;
  }

  if (didProgressSave && updatedPeriods.length === 0 && skippedPeriods.length > 0) {
    return `${cleanStudentName} 학생의 ${cleanActivityLabel} 성장 기록을 저장했고, 리더보드는 기존 최고 기록을 유지했습니다.`;
  }

  if (didProgressSave && hasLeaderboard) {
    return `${cleanStudentName} 학생의 ${cleanActivityLabel} 성장 기록과 리더보드 점수를 저장했습니다.`;
  }

  return `${cleanStudentName} 학생의 결과 저장 상태를 확인해 주세요.`;
}
