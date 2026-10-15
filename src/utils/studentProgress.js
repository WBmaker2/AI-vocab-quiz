import { BADGE_IDS } from "../constants/badges.js";
import {
  normalizeStudentName,
  normalizeStudentNameKey,
} from "./leaderboard.js";
import { isStudentProfileCapabilityToken } from "./studentProfileCapability.js";
import {
  ACTIVITY_TYPES,
  compareListeningProgress,
  compareMatchingProgress,
  compareSpeakingProgress,
  compareTypingProgress,
  getKnownBadgeIds,
} from "./studentActivityProgress.js";
export {
  compareListeningProgress,
  compareMatchingProgress,
  compareSpeakingProgress,
  compareTypingProgress,
};

export const MATCHING_SPEED_BADGE_THRESHOLD_SECONDS = 45;
export const PRACTICE_KEEPER_BADGE_MIN_SESSIONS = 3;


function normalizeScopeValue(value) {
  return String(value ?? "").trim();
}

export function toNonNegativeInteger(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return 0;
  }

  return Math.max(0, Math.floor(numberValue));
}

export function toNonNegativeNumber(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return 0;
  }

  return Math.max(0, numberValue);
}

export function formatElapsedSeconds(totalSeconds) {
  const safeSeconds = toNonNegativeInteger(totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
  }

  return [minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export function formatAccuracy(value) {
  const safeAccuracy = toNonNegativeNumber(value);
  return Number.isInteger(safeAccuracy)
    ? `${safeAccuracy}%`
    : `${safeAccuracy.toFixed(1).replace(/\.0$/, "")}%`;
}


export function normalizeStudentProfileName(value) {
  return normalizeStudentName(value);
}

export function createStudentProfileId({
  schoolId,
  grade,
  studentName,
  profileToken,
}) {
  if (!isStudentProfileCapabilityToken(profileToken)) {
    throw new Error("Student profile capability is required.");
  }

  return [
    normalizeScopeValue(schoolId),
    normalizeScopeValue(grade),
    normalizeStudentNameKey(normalizeStudentProfileName(studentName)),
    profileToken,
  ].join("__");
}


export function evaluateEarnedBadges({ profile, activityType, result, comparison }) {
  const currentProfile = profile ?? {};
  const currentTotalSessions = toNonNegativeInteger(currentProfile.totalSessions);
  const earnedBadges = new Set(getKnownBadgeIds(currentProfile.earnedBadges));
  const comparisonResult =
    comparison ??
    (activityType === ACTIVITY_TYPES.listening
      ? compareListeningProgress(currentProfile, result)
      : activityType === ACTIVITY_TYPES.speaking
        ? compareSpeakingProgress(currentProfile, result)
        : activityType === ACTIVITY_TYPES.typing
          ? compareTypingProgress(currentProfile, result)
          : compareMatchingProgress(currentProfile, result));
  const newlyEarnedBadges = [];

  if (
    currentTotalSessions === 0 &&
    !earnedBadges.has("first_challenge")
  ) {
    newlyEarnedBadges.push("first_challenge");
    earnedBadges.add("first_challenge");
  }

  if (
    activityType === ACTIVITY_TYPES.listening &&
    comparisonResult.isNewBest &&
    comparisonResult.bestValue.score > 0 &&
    !earnedBadges.has("listening_star")
  ) {
    newlyEarnedBadges.push("listening_star");
    earnedBadges.add("listening_star");
  }

  if (
    activityType === ACTIVITY_TYPES.speaking &&
    result?.completed !== false &&
    !earnedBadges.has("speaking_bravery")
  ) {
    newlyEarnedBadges.push("speaking_bravery");
    earnedBadges.add("speaking_bravery");
  }

  if (
    activityType === ACTIVITY_TYPES.matching &&
    toNonNegativeInteger(result?.elapsedSeconds) > 0 &&
    toNonNegativeInteger(result?.elapsedSeconds) <=
      MATCHING_SPEED_BADGE_THRESHOLD_SECONDS &&
    !earnedBadges.has("matching_speed")
  ) {
    newlyEarnedBadges.push("matching_speed");
    earnedBadges.add("matching_speed");
  }

  if (
    currentTotalSessions + 1 >= PRACTICE_KEEPER_BADGE_MIN_SESSIONS &&
    !earnedBadges.has("practice_keeper")
  ) {
    newlyEarnedBadges.push("practice_keeper");
    earnedBadges.add("practice_keeper");
  }

  return BADGE_IDS.filter((badgeId) => newlyEarnedBadges.includes(badgeId));
}

export function buildProgressSummary({ activityType, comparisonResult }) {
  const activityLabels = {
    [ACTIVITY_TYPES.listening]: "듣기 성장 기록",
    [ACTIVITY_TYPES.speaking]: "말하기 성장 기록",
    [ACTIVITY_TYPES.matching]: "짝 맞추기 성장 기록",
    [ACTIVITY_TYPES.typing]: "영어 타자 성장 기록",
  };

  return {
    activityType,
    title: comparisonResult?.isNewBest
      ? "개인 최고 기록을 갱신했어요."
      : "기록을 차근차근 이어가고 있어요.",
    label: activityLabels[activityType] ?? "성장 기록",
    isNewBest: Boolean(comparisonResult?.isNewBest),
    summaryLines: Array.isArray(comparisonResult?.summaryLines)
      ? comparisonResult.summaryLines
      : [],
    bestValue: comparisonResult?.bestValue ?? null,
    currentValue: comparisonResult?.currentValue ?? null,
    previousBest: comparisonResult?.previousBest ?? null,
    nextHint: comparisonResult?.nextHint ?? "",
  };
}
