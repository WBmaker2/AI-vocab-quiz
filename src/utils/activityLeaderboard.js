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
  {
    type: "typing",
    label: "영어 타자",
    collectionName: "typingLeaderboards",
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

function toMillis(value) {
  if (!value) {
    return 0;
  }

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (value.seconds != null) {
    return Number(value.seconds) * 1000;
  }

  return 0;
}

function hasTypingMetrics(entry) {
  return Boolean(entry) && (
    Object.prototype.hasOwnProperty.call(entry, "accuracy") ||
    Object.prototype.hasOwnProperty.call(entry, "bestCombo")
  );
}

function pickBetterTypingLeaderboardEntry(left, right) {
  if (!left) {
    return right ?? null;
  }

  if (!right) {
    return left;
  }

  const leftScore = Number(left.score ?? 0);
  const rightScore = Number(right.score ?? 0);

  if (leftScore !== rightScore) {
    return rightScore > leftScore ? right : left;
  }

  const leftAccuracy = Number(left.accuracy ?? 0);
  const rightAccuracy = Number(right.accuracy ?? 0);

  if (leftAccuracy !== rightAccuracy) {
    return rightAccuracy > leftAccuracy ? right : left;
  }

  const leftElapsed = Number(left.elapsedSeconds ?? Number.POSITIVE_INFINITY);
  const rightElapsed = Number(right.elapsedSeconds ?? Number.POSITIVE_INFINITY);

  if (leftElapsed !== rightElapsed) {
    return rightElapsed < leftElapsed ? right : left;
  }

  const leftBestCombo = Number(left.bestCombo ?? 0);
  const rightBestCombo = Number(right.bestCombo ?? 0);

  if (leftBestCombo !== rightBestCombo) {
    return rightBestCombo > leftBestCombo ? right : left;
  }

  const leftUpdatedAt = toMillis(left.updatedAt) || toMillis(left.createdAt);
  const rightUpdatedAt = toMillis(right.updatedAt) || toMillis(right.createdAt);

  if (leftUpdatedAt !== rightUpdatedAt) {
    return rightUpdatedAt > leftUpdatedAt ? right : left;
  }

  return left;
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
  return hasTypingMetrics(left) || hasTypingMetrics(right)
    ? pickBetterTypingLeaderboardEntry(left, right)
    : pickBetterLeaderboardEntry(left, right);
}
