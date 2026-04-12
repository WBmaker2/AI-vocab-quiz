import {
  ACTIVITY_LEADERBOARD_DEFINITIONS,
  getActivityLeaderboardDefinition,
} from "./activityLeaderboard.js";

export const TEACHER_ACTIVITY_LEADERBOARD_DEFINITIONS =
  ACTIVITY_LEADERBOARD_DEFINITIONS;

export function getTeacherActivityLeaderboardDefinition(activityType) {
  return getActivityLeaderboardDefinition(activityType);
}

export function summarizeTeacherLeaderboardOutcome(periods, kind) {
  if (!periods || periods.length === 0) {
    return "";
  }

  const periodLabelMap = {
    week: "주간",
    month: "월간",
    year: "연간",
    school_all: "학교 전체",
  };
  const labels = periods.map((period) => periodLabelMap[period] ?? period);

  if (labels.length === 1) {
    return `${labels[0]} ${kind}`;
  }

  return `${labels.join(", ")} ${kind}`;
}
