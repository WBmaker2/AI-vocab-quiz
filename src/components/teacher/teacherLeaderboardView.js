import { formatElapsedSeconds } from "../../utils/quiz.js";
export {
  getTeacherActivityLeaderboardDefinition,
  TEACHER_ACTIVITY_LEADERBOARD_DEFINITIONS,
} from "../../utils/teacherLeaderboards.js";

export function formatTeacherLeaderboardAccuracy(value) {
  const numericValue = Number(value ?? 0);

  return Number.isInteger(numericValue)
    ? `${numericValue}%`
    : `${numericValue.toFixed(1)}%`;
}

export function formatTeacherLeaderboardEntryDetail(
  entry,
  activityType,
  periodType,
) {
  const detailParts = [];

  if (periodType === "school_all" && entry.grade && entry.grade !== "all") {
    detailParts.push(`${entry.grade}학년`);
  }

  detailParts.push(formatElapsedSeconds(entry.elapsedSeconds));

  if (activityType === "fishing") {
    detailParts.push(`정답 ${entry.correctCount ?? 0}`);
    detailParts.push(`오답 ${entry.wrongCount ?? 0}`);
    detailParts.push(`놓침 ${entry.missCount ?? 0}`);
  } else if (activityType === "spelling") {
    detailParts.push(
      `정답 ${entry.correctCount ?? 0}/${entry.questionCount ?? 0}`,
    );
    detailParts.push(`공개 ${entry.revealedCount ?? 0}회`);
    detailParts.push(`도움 ${entry.hintUsedCount ?? 0}회`);
    detailParts.push(`시도 ${entry.totalAttempts ?? 0}회`);
  } else if (activityType === "typing") {
    detailParts.push(
      `정답 ${entry.correctCount ?? 0}/${entry.questionCount ?? 0}`,
    );
    detailParts.push(
      `정확도 ${formatTeacherLeaderboardAccuracy(entry.accuracy)}`,
    );
    detailParts.push(`힌트 ${entry.hintUsedCount ?? 0}회`);
    detailParts.push(`최고 ${entry.bestCombo ?? 0}콤보`);
  } else {
    detailParts.push(`짝 ${entry.solvedPairs ?? 0}개`);
  }

  return detailParts.join(" · ");
}
