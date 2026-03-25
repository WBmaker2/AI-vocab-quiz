import { BADGE_IDS } from "../constants/badges.js";
import {
  normalizeStudentName,
  normalizeStudentNameKey,
} from "./leaderboard.js";

export const MATCHING_SPEED_BADGE_THRESHOLD_SECONDS = 45;
export const PRACTICE_KEEPER_BADGE_MIN_SESSIONS = 3;

const ACTIVITY_TYPES = Object.freeze({
  listening: "listening",
  speaking: "speaking",
  matching: "matching",
});

const BADGE_ID_SET = new Set(BADGE_IDS);

function normalizeScopeValue(value) {
  return String(value ?? "").trim();
}

function toNonNegativeInteger(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return 0;
  }

  return Math.max(0, Math.floor(numberValue));
}

function formatElapsedSeconds(totalSeconds) {
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

function getCurrentBestProfileValue(profile, fieldName) {
  return toNonNegativeInteger(profile?.[fieldName]);
}

function getKnownBadgeIds(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.filter((value) => BADGE_ID_SET.has(String(value ?? "")));
}

function createComparisonResult({
  activityType,
  isNewBest,
  previousBest,
  bestValue,
  currentValue,
  summaryLines,
  nextHint,
}) {
  return {
    activityType,
    isNewBest,
    previousBest,
    bestValue,
    currentValue,
    summaryLines,
    nextHint,
  };
}

function createScoreComparisonSummary({
  label,
  hasExistingBest,
  isNewBest,
  previousScore,
  previousCorrectCount,
  currentScore,
  currentCorrectCount,
}) {
  if (!hasExistingBest) {
    return [
      "첫 기록을 남겼어요.",
      `${label} 최고 점수 ${currentScore}점`,
      `정답 수 ${currentCorrectCount}개`,
    ];
  }

  const summaryLines = [
    isNewBest ? `${label} 최고 기록 갱신!` : `${label} 최고 기록을 유지했어요.`,
  ];

  if (isNewBest && currentScore > previousScore) {
    summaryLines.push(`${previousScore}점에서 ${currentScore}점으로 올라갔어요.`);
  } else if (isNewBest && currentCorrectCount > previousCorrectCount) {
    summaryLines.push(
      `정답 수가 ${currentCorrectCount - previousCorrectCount}개 늘었어요.`,
    );
  } else {
    summaryLines.push(
      `이번에는 ${currentScore}점 ${currentCorrectCount}개였고, 최고 기록은 ${previousScore}점 ${previousCorrectCount}개예요.`,
    );
  }

  return summaryLines;
}

function compareBestScoreProgress({
  activityType,
  label,
  profile,
  sessionCountFieldName,
  scoreFieldName,
  correctCountFieldName,
  result,
  nextHint,
}) {
  const currentScore = toNonNegativeInteger(result?.score);
  const currentCorrectCount = toNonNegativeInteger(
    result?.correctCount ?? result?.score,
  );
  const hasExistingBest =
    toNonNegativeInteger(profile?.[sessionCountFieldName]) > 0;
  const previousScore = hasExistingBest
    ? getCurrentBestProfileValue(profile, scoreFieldName)
    : 0;
  const previousCorrectCount = hasExistingBest
    ? getCurrentBestProfileValue(profile, correctCountFieldName)
    : 0;
  const isNewBest =
    !hasExistingBest ||
    currentScore > previousScore ||
    (currentScore === previousScore &&
      currentCorrectCount > previousCorrectCount);
  const bestValue = {
    score: isNewBest ? currentScore : previousScore,
    correctCount: isNewBest ? currentCorrectCount : previousCorrectCount,
  };
  const summaryLines = createScoreComparisonSummary({
    label,
    hasExistingBest,
    isNewBest,
    previousScore,
    previousCorrectCount,
    currentScore,
    currentCorrectCount,
  });

  return createComparisonResult({
    activityType,
    isNewBest,
    previousBest: hasExistingBest
      ? {
          score: previousScore,
          correctCount: previousCorrectCount,
        }
      : null,
    bestValue,
    currentValue: {
      score: currentScore,
      correctCount: currentCorrectCount,
    },
    summaryLines,
    nextHint,
  });
}

function createMatchingSummary({
  hasExistingBest,
  isNewBest,
  previousScore,
  previousElapsedSeconds,
  currentScore,
  currentElapsedSeconds,
}) {
  if (!hasExistingBest) {
    return [
      "첫 기록을 남겼어요.",
      `최고 점수 ${currentScore}점`,
      `완료 시간 ${formatElapsedSeconds(currentElapsedSeconds)}`,
    ];
  }

  const summaryLines = [
    isNewBest ? "개인 최고 점수 갱신!" : "개인 최고 기록을 유지했어요.",
  ];

  if (isNewBest && currentScore > previousScore) {
    summaryLines.push(`${previousScore}점에서 ${currentScore}점으로 올라갔어요.`);
  } else if (isNewBest && currentElapsedSeconds < previousElapsedSeconds) {
    summaryLines.push(
      `지난번보다 ${previousElapsedSeconds - currentElapsedSeconds}초 빨라졌어요.`,
    );
  } else {
    summaryLines.push(
      `이번에는 ${currentScore}점 ${formatElapsedSeconds(currentElapsedSeconds)}였고, 최고 기록은 ${previousScore}점 ${formatElapsedSeconds(previousElapsedSeconds)}이에요.`,
    );
  }

  return summaryLines;
}

export function normalizeStudentProfileName(value) {
  return normalizeStudentName(value);
}

export function createStudentProfileId({ schoolId, grade, studentName }) {
  return [
    normalizeScopeValue(schoolId),
    normalizeScopeValue(grade),
    normalizeStudentNameKey(normalizeStudentProfileName(studentName)),
  ].join("__");
}

export function compareListeningProgress(profile, result) {
  const currentScore = toNonNegativeInteger(result?.score);
  const currentCorrectCount = toNonNegativeInteger(
    result?.correctCount ?? result?.score,
  );
  const previousScore = getCurrentBestProfileValue(profile, "listeningBestScore");
  const previousCorrectCount = getCurrentBestProfileValue(
    profile,
    "listeningBestCorrectCount",
  );

  return compareBestScoreProgress({
    activityType: ACTIVITY_TYPES.listening,
    label: "듣기",
    profile,
    sessionCountFieldName: "listeningSessions",
    scoreFieldName: "listeningBestScore",
    correctCountFieldName: "listeningBestCorrectCount",
    result: {
      score: currentScore,
      correctCount: currentCorrectCount,
    },
    nextHint:
      currentScore > previousScore
        ? `다음에는 ${currentScore + 1}점을 노려보세요.`
        : `정답 수를 ${previousCorrectCount + 1}개 이상으로 늘려보세요.`,
  });
}

export function compareSpeakingProgress(profile, result) {
  const currentScore = toNonNegativeInteger(result?.score);
  const currentCorrectCount = toNonNegativeInteger(
    result?.correctCount ?? result?.score,
  );
  const previousScore = getCurrentBestProfileValue(profile, "speakingBestScore");
  const previousCorrectCount = getCurrentBestProfileValue(
    profile,
    "speakingBestCorrectCount",
  );

  return compareBestScoreProgress({
    activityType: ACTIVITY_TYPES.speaking,
    label: "말하기",
    profile,
    sessionCountFieldName: "speakingSessions",
    scoreFieldName: "speakingBestScore",
    correctCountFieldName: "speakingBestCorrectCount",
    result: {
      score: currentScore,
      correctCount: currentCorrectCount,
    },
    nextHint:
      currentScore > previousScore
        ? `다음에는 ${currentScore + 1}점을 노려보세요.`
        : `정확도를 더 높여서 ${previousCorrectCount + 1}개 이상 맞혀보세요.`,
  });
}

export function compareMatchingProgress(profile, result) {
  const currentScore = toNonNegativeInteger(result?.score);
  const currentElapsedSeconds = toNonNegativeInteger(result?.elapsedSeconds);
  const hasExistingBest = toNonNegativeInteger(profile?.matchingSessions) > 0;
  const previousScore = hasExistingBest
    ? getCurrentBestProfileValue(profile, "matchingBestScore")
    : 0;
  const previousElapsedSeconds = hasExistingBest
    ? getCurrentBestProfileValue(profile, "matchingBestTime")
    : 0;
  const isNewBest =
    !hasExistingBest ||
    currentScore > previousScore ||
    (currentScore === previousScore &&
      currentElapsedSeconds < previousElapsedSeconds);
  const bestValue = {
    score: isNewBest ? currentScore : previousScore,
    elapsedSeconds: isNewBest ? currentElapsedSeconds : previousElapsedSeconds,
  };

  return createComparisonResult({
    activityType: ACTIVITY_TYPES.matching,
    isNewBest,
    previousBest: hasExistingBest
      ? {
          score: previousScore,
          elapsedSeconds: previousElapsedSeconds,
        }
      : null,
    bestValue,
    currentValue: {
      score: currentScore,
      elapsedSeconds: currentElapsedSeconds,
    },
    summaryLines: createMatchingSummary({
      hasExistingBest,
      isNewBest,
      previousScore,
      previousElapsedSeconds,
      currentScore,
      currentElapsedSeconds,
    }),
    nextHint:
      !hasExistingBest
        ? "다음에는 더 빠르게 맞춰보세요."
        : currentScore > previousScore
          ? `점수는 좋지만 더 단단하게 맞춰보세요.`
          : `다음에는 ${Math.max(1, previousElapsedSeconds - 1)}초만 더 줄여보세요.`,
  });
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
