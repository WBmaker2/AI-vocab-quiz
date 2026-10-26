import { normalizeLeaderboardScope, normalizeLeaderboardText, validateFishingLeaderboardResult, validateMatchingLeaderboardResult, validateTypingLeaderboardResult } from "./firebaseLeaderboardValidation.js";
import { createMatchingLeaderboardScopeKey, normalizeStudentNameKey } from "../utils/leaderboard.js";
import { doc, serverTimestamp } from "firebase/firestore";

export function createMatchingLeaderboardPayload({
  schoolId,
  schoolName,
  grade,
  studentName,
  periodType,
  periodKey,
  score,
  elapsedSeconds,
  solvedPairs,
}) {
  const cleanSchoolId = normalizeLeaderboardScope(schoolId);
  const cleanSchoolName = normalizeLeaderboardText(schoolName);
  const cleanGrade = normalizeLeaderboardScope(grade);
  const cleanStudentName = normalizeLeaderboardText(studentName);
  const cleanStudentNameNormalized = normalizeStudentNameKey(studentName);
  const result = validateMatchingLeaderboardResult({
    score,
    elapsedSeconds,
    solvedPairs,
  });

  return {
    scopeKey: createMatchingLeaderboardScopeKey({
      schoolId: cleanSchoolId,
      grade: cleanGrade,
      periodType,
      periodKey,
    }),
    schoolId: cleanSchoolId,
    schoolName: cleanSchoolName,
    grade: cleanGrade,
    studentName: cleanStudentName,
    studentNameNormalized: cleanStudentNameNormalized,
    periodType,
    periodKey,
    ...result,
  };
}

export function createFishingLeaderboardPayload({
  schoolId,
  schoolName,
  grade,
  studentName,
  periodType,
  periodKey,
  score,
  elapsedSeconds,
  correctCount,
  wrongCount,
  missCount,
}) {
  const cleanSchoolId = normalizeLeaderboardScope(schoolId);
  const cleanSchoolName = normalizeLeaderboardText(schoolName);
  const cleanGrade = normalizeLeaderboardScope(grade);
  const cleanStudentName = normalizeLeaderboardText(studentName);
  const cleanStudentNameNormalized = normalizeStudentNameKey(studentName);
  const result = validateFishingLeaderboardResult({
    score,
    elapsedSeconds,
    correctCount,
    wrongCount,
    missCount,
  });

  return {
    scopeKey: createMatchingLeaderboardScopeKey({
      schoolId: cleanSchoolId,
      grade: cleanGrade,
      periodType,
      periodKey,
    }),
    schoolId: cleanSchoolId,
    schoolName: cleanSchoolName,
    grade: cleanGrade,
    studentName: cleanStudentName,
    studentNameNormalized: cleanStudentNameNormalized,
    periodType,
    periodKey,
    ...result,
  };
}

export function createTypingLeaderboardPayload({
  schoolId,
  schoolName,
  grade,
  studentName,
  periodType,
  periodKey,
  score,
  elapsedSeconds,
  questionCount,
  correctCount,
  accuracy,
  hintUsedCount,
  bestCombo,
}) {
  const cleanSchoolId = normalizeLeaderboardScope(schoolId);
  const cleanSchoolName = normalizeLeaderboardText(schoolName);
  const cleanGrade = normalizeLeaderboardScope(grade);
  const cleanStudentName = normalizeLeaderboardText(studentName);
  const cleanStudentNameNormalized = normalizeStudentNameKey(studentName);
  const result = validateTypingLeaderboardResult({
    score,
    elapsedSeconds,
    questionCount,
    correctCount,
    accuracy,
    hintUsedCount,
    bestCombo,
  });

  return {
    scopeKey: createMatchingLeaderboardScopeKey({
      schoolId: cleanSchoolId,
      grade: cleanGrade,
      periodType,
      periodKey,
    }),
    schoolId: cleanSchoolId,
    schoolName: cleanSchoolName,
    grade: cleanGrade,
    studentName: cleanStudentName,
    studentNameNormalized: cleanStudentNameNormalized,
    periodType,
    periodKey,
    ...result,
  };
}

export function createMatchingLeaderboardEntryRef(
  firestore,
  { schoolId, grade, periodType, periodKey, studentName },
) {
  const scopeKey = createMatchingLeaderboardScopeKey({
    schoolId,
    grade,
    periodType,
    periodKey,
  });
  const studentKey = normalizeStudentNameKey(studentName);

  return {
    scopeKey,
    studentKey,
    ref: doc(
      firestore,
      "matchingLeaderboards",
      scopeKey,
      "entries",
      studentKey,
    ),
  };
}

export function createFishingLeaderboardEntryRef(
  firestore,
  { schoolId, grade, periodType, periodKey, studentName },
) {
  const scopeKey = createMatchingLeaderboardScopeKey({
    schoolId,
    grade,
    periodType,
    periodKey,
  });
  const studentKey = normalizeStudentNameKey(studentName);

  return {
    scopeKey,
    studentKey,
    ref: doc(
      firestore,
      "fishingLeaderboards",
      scopeKey,
      "entries",
      studentKey,
    ),
  };
}

export function createTypingLeaderboardEntryRef(
  firestore,
  { schoolId, grade, periodType, periodKey, studentName },
) {
  const scopeKey = createMatchingLeaderboardScopeKey({
    schoolId,
    grade,
    periodType,
    periodKey,
  });
  const studentKey = normalizeStudentNameKey(studentName);

  return {
    scopeKey,
    studentKey,
    ref: doc(
      firestore,
      "typingLeaderboards",
      scopeKey,
      "entries",
      studentKey,
    ),
  };
}

export function createMatchingLeaderboardWritePayload({
  source,
  schoolId,
  schoolName,
  grade,
  studentName,
  periodType,
  periodKey,
}) {
  const cleanStudentName = normalizeLeaderboardText(studentName);
  const cleanSchoolName = normalizeLeaderboardText(
    source.schoolName ?? schoolName,
  );
  const payload = createMatchingLeaderboardPayload({
    schoolId,
    schoolName: cleanSchoolName,
    grade,
    studentName: cleanStudentName,
    periodType,
    periodKey,
    score: source.score,
    elapsedSeconds: source.elapsedSeconds,
    solvedPairs: source.solvedPairs,
  });

  return {
    ...payload,
    schoolName: cleanSchoolName,
    studentName: cleanStudentName,
    studentNameNormalized: normalizeStudentNameKey(cleanStudentName),
    createdAt: source.createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export function createFishingLeaderboardWritePayload({
  source,
  schoolId,
  schoolName,
  grade,
  studentName,
  periodType,
  periodKey,
}) {
  const cleanStudentName = normalizeLeaderboardText(studentName);
  const cleanSchoolName = normalizeLeaderboardText(
    source.schoolName ?? schoolName,
  );
  const payload = createFishingLeaderboardPayload({
    schoolId,
    schoolName: cleanSchoolName,
    grade,
    studentName: cleanStudentName,
    periodType,
    periodKey,
    score: source.score,
    elapsedSeconds: source.elapsedSeconds,
    correctCount: source.correctCount,
    wrongCount: source.wrongCount,
    missCount: source.missCount,
  });

  return {
    ...payload,
    schoolName: cleanSchoolName,
    studentName: cleanStudentName,
    studentNameNormalized: normalizeStudentNameKey(cleanStudentName),
    createdAt: source.createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export function createTypingLeaderboardWritePayload({
  source,
  schoolId,
  schoolName,
  grade,
  studentName,
  periodType,
  periodKey,
}) {
  const cleanStudentName = normalizeLeaderboardText(studentName);
  const cleanSchoolName = normalizeLeaderboardText(
    source.schoolName ?? schoolName,
  );
  const payload = createTypingLeaderboardPayload({
    schoolId,
    schoolName: cleanSchoolName,
    grade,
    studentName: cleanStudentName,
    periodType,
    periodKey,
    score: source.score,
    elapsedSeconds: source.elapsedSeconds,
    questionCount: source.questionCount,
    correctCount: source.correctCount,
    accuracy: source.accuracy,
    hintUsedCount: source.hintUsedCount,
    bestCombo: source.bestCombo,
  });

  return {
    ...payload,
    schoolName: cleanSchoolName,
    studentName: cleanStudentName,
    studentNameNormalized: normalizeStudentNameKey(cleanStudentName),
    createdAt: source.createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export function pickBetterTypingLeaderboardEntry(left, right) {
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

  const leftUpdatedAt = left.updatedAt?.toMillis?.() ?? left.createdAt?.toMillis?.() ?? 0;
  const rightUpdatedAt = right.updatedAt?.toMillis?.() ?? right.createdAt?.toMillis?.() ?? 0;

  if (leftUpdatedAt !== rightUpdatedAt) {
    return rightUpdatedAt > leftUpdatedAt ? right : left;
  }

  return left;
}

export function shouldReplaceElapsedLeaderboardEntry({
  nextScore,
  nextElapsedSeconds,
  existingScore,
  existingElapsedSeconds,
}) {
  const cleanNextScore = Number(nextScore ?? 0);
  const cleanExistingScore = Number(existingScore ?? 0);

  if (cleanNextScore !== cleanExistingScore) {
    return cleanNextScore > cleanExistingScore;
  }

  const cleanNextElapsedSeconds = Number(
    nextElapsedSeconds ?? Number.POSITIVE_INFINITY,
  );
  const cleanExistingElapsedSeconds = Number(
    existingElapsedSeconds ?? Number.POSITIVE_INFINITY,
  );

  return cleanNextElapsedSeconds < cleanExistingElapsedSeconds;
}
