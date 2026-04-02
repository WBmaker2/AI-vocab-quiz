import {
  createMatchingLeaderboardGradeScope,
  createMatchingLeaderboardScopeKey,
  normalizeStudentName,
  normalizeStudentNameKey,
  pickBetterLeaderboardEntry,
} from "./leaderboard.js";

export const ACTIVITY_LEADERBOARD_DEFINITIONS = [
  {
    type: "matching",
    label: "짝 맞추기",
    collectionName: "matchingLeaderboards",
  },
  {
    type: "fishing",
    label: "단어 낚시",
    collectionName: "fishingLeaderboards",
  },
];

const ACTIVITY_LEADERBOARD_MAP = new Map(
  ACTIVITY_LEADERBOARD_DEFINITIONS.map((definition) => [definition.type, definition]),
);

export function normalizeActivityLeaderboardType(value) {
  const normalized = String(value ?? "").trim().toLowerCase();

  return ACTIVITY_LEADERBOARD_MAP.has(normalized) ? normalized : "matching";
}

export function getActivityLeaderboardDefinition(value) {
  return (
    ACTIVITY_LEADERBOARD_MAP.get(normalizeActivityLeaderboardType(value))
    ?? ACTIVITY_LEADERBOARD_DEFINITIONS[0]
  );
}

export function getActivityLeaderboardCollectionName(value) {
  return getActivityLeaderboardDefinition(value).collectionName;
}

export function createActivityLeaderboardScopeKey({
  schoolId,
  grade,
  periodType,
  periodKey,
}) {
  return createMatchingLeaderboardScopeKey({
    schoolId,
    grade,
    periodType,
    periodKey,
  });
}

export function createActivityLeaderboardGradeScope(periodType, grade) {
  return createMatchingLeaderboardGradeScope(periodType, grade);
}

export function normalizeActivityLeaderboardStudentName(value) {
  return normalizeStudentName(value);
}

export function createActivityLeaderboardStudentKey(value) {
  return normalizeStudentNameKey(value);
}

export function pickBetterActivityLeaderboardEntry(left, right) {
  return pickBetterLeaderboardEntry(left, right);
}
