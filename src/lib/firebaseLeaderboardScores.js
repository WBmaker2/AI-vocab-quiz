import { fetchFishingLeaderboardPeriod, fetchMatchingLeaderboardPeriod, fetchTypingLeaderboardPeriod, upsertFishingLeaderboardPeriod, upsertMatchingLeaderboardPeriod, upsertTypingLeaderboardPeriod } from "./firebaseLeaderboardPeriods.js";
import { normalizeLeaderboardScope, normalizeLeaderboardText, validateFishingLeaderboardResult, validateMatchingLeaderboardResult, validateTypingLeaderboardResult } from "./firebaseLeaderboardValidation.js";
import { spellingLeaderboardApi } from "./firebaseTeacherLeaderboardAdmin.js";
import { LEADERBOARD_PERIOD_DEFINITIONS, createLeaderboardPeriodKeys, normalizeStudentName } from "../utils/leaderboard.js";
import { ensureFirebase } from "./firebaseCore.js";

export async function fetchMatchingLeaderboards({
  schoolId,
  grade,
  now = new Date(),
  limitCount = 10,
}) {
  const { db: firestore } = ensureFirebase();
  const periodKeys = createLeaderboardPeriodKeys(now);
  const leaderboardEntries = await Promise.all(
    LEADERBOARD_PERIOD_DEFINITIONS.map(async ({ type, label }) => {
      const scopeGrade = createMatchingLeaderboardGradeScope(type, grade);
      const periodResult = await fetchMatchingLeaderboardPeriod({
        firestore,
        schoolId,
        grade: scopeGrade,
        periodType: type,
        periodKey: periodKeys[type],
        limitCount,
      });

      return [
        type,
        {
          periodType: type,
          periodKey: periodResult.periodKey,
          label,
          entries: periodResult.entries,
        },
      ];
    }),
  );

  return Object.fromEntries(leaderboardEntries);
}

export async function fetchFishingLeaderboards({
  schoolId,
  grade,
  now = new Date(),
  limitCount = 10,
}) {
  const { db: firestore } = ensureFirebase();
  const periodKeys = createLeaderboardPeriodKeys(now);
  const leaderboardEntries = await Promise.all(
    LEADERBOARD_PERIOD_DEFINITIONS.map(async ({ type, label }) => {
      const scopeGrade = createMatchingLeaderboardGradeScope(type, grade);
      const periodResult = await fetchFishingLeaderboardPeriod({
        firestore,
        schoolId,
        grade: scopeGrade,
        periodType: type,
        periodKey: periodKeys[type],
        limitCount,
      });

      return [
        type,
        {
          periodType: type,
          periodKey: periodResult.periodKey,
          label,
          entries: periodResult.entries,
        },
      ];
    }),
  );

  return Object.fromEntries(leaderboardEntries);
}

export async function fetchTypingLeaderboards({
  schoolId,
  grade,
  now = new Date(),
  limitCount = 10,
}) {
  const { db: firestore } = ensureFirebase();
  const periodKeys = createLeaderboardPeriodKeys(now);
  const leaderboardEntries = await Promise.all(
    LEADERBOARD_PERIOD_DEFINITIONS.map(async ({ type, label }) => {
      const scopeGrade = createMatchingLeaderboardGradeScope(type, grade);
      const periodResult = await fetchTypingLeaderboardPeriod({
        firestore,
        schoolId,
        grade: scopeGrade,
        periodType: type,
        periodKey: periodKeys[type],
        limitCount,
      });

      return [
        type,
        {
          periodType: type,
          periodKey: periodResult.periodKey,
          label,
          entries: periodResult.entries,
        },
      ];
    }),
  );

  return Object.fromEntries(leaderboardEntries);
}

export async function fetchSpellingLeaderboards({
  schoolId,
  grade,
  now = new Date(),
  limitCount = 10,
}) {
  return spellingLeaderboardApi.fetchSpellingLeaderboards({
    schoolId,
    grade,
    now,
    limitCount,
  });
}

export async function saveMatchingLeaderboardScore({
  schoolId,
  schoolName,
  grade,
  studentName,
  score,
  elapsedSeconds,
  solvedPairs,
  now = new Date(),
}) {
  const { db: firestore } = ensureFirebase();
  const cleanSchoolId = normalizeLeaderboardScope(schoolId);
  const cleanSchoolName = normalizeLeaderboardText(schoolName);
  const cleanGrade = normalizeLeaderboardScope(grade);
  const cleanStudentName = normalizeStudentName(studentName);

  if (!cleanSchoolId) {
    throw new Error("School id is required.");
  }

  if (!cleanSchoolName) {
    throw new Error("School name is required.");
  }

  if (!cleanGrade) {
    throw new Error("Grade is required.");
  }

  if (!cleanStudentName) {
    throw new Error("Student name is required.");
  }

  const validatedResult = validateMatchingLeaderboardResult({
    score,
    elapsedSeconds,
    solvedPairs,
  });

  const periodKeys = createLeaderboardPeriodKeys(now);
  const updatedPeriods = [];
  const skippedPeriods = [];
  const failedPeriods = [];
  let lastError = null;

  for (const { type } of LEADERBOARD_PERIOD_DEFINITIONS) {
    const scopeGrade = createMatchingLeaderboardGradeScope(type, cleanGrade);
    try {
      const result = await upsertMatchingLeaderboardPeriod({
        firestore,
        schoolId: cleanSchoolId,
        schoolName: cleanSchoolName,
        grade: scopeGrade,
        studentName: cleanStudentName,
        periodType: type,
        periodKey: periodKeys[type],
        ...validatedResult,
      });

      if (result === "skipped") {
        skippedPeriods.push(type);
      } else {
        updatedPeriods.push(type);
      }
    } catch (error) {
      failedPeriods.push(type);
      lastError = error;
    }
  }

  if (failedPeriods.length > 0 && updatedPeriods.length === 0 && skippedPeriods.length === 0) {
    throw lastError ?? new Error("리더보드 점수를 저장하지 못했습니다.");
  }

  return {
    updatedPeriods,
    skippedPeriods,
    failedPeriods,
  };
}

export async function saveFishingLeaderboardScore({
  schoolId,
  schoolName,
  grade,
  studentName,
  score,
  elapsedSeconds,
  correctCount,
  wrongCount,
  missCount,
  now = new Date(),
}) {
  const { db: firestore } = ensureFirebase();
  const cleanSchoolId = normalizeLeaderboardScope(schoolId);
  const cleanSchoolName = normalizeLeaderboardText(schoolName);
  const cleanGrade = normalizeLeaderboardScope(grade);
  const cleanStudentName = normalizeStudentName(studentName);

  if (!cleanSchoolId) {
    throw new Error("School id is required.");
  }

  if (!cleanSchoolName) {
    throw new Error("School name is required.");
  }

  if (!cleanGrade) {
    throw new Error("Grade is required.");
  }

  if (!cleanStudentName) {
    throw new Error("Student name is required.");
  }

  const validatedResult = validateFishingLeaderboardResult({
    score,
    elapsedSeconds,
    correctCount,
    wrongCount,
    missCount,
  });

  const periodKeys = createLeaderboardPeriodKeys(now);
  const updatedPeriods = [];
  const skippedPeriods = [];
  const failedPeriods = [];
  let lastError = null;

  for (const { type } of LEADERBOARD_PERIOD_DEFINITIONS) {
    const scopeGrade = createMatchingLeaderboardGradeScope(type, cleanGrade);
    try {
      const result = await upsertFishingLeaderboardPeriod({
        firestore,
        schoolId: cleanSchoolId,
        schoolName: cleanSchoolName,
        grade: scopeGrade,
        studentName: cleanStudentName,
        periodType: type,
        periodKey: periodKeys[type],
        ...validatedResult,
      });

      if (result === "skipped") {
        skippedPeriods.push(type);
      } else {
        updatedPeriods.push(type);
      }
    } catch (error) {
      failedPeriods.push(type);
      lastError = error;
    }
  }

  if (failedPeriods.length > 0 && updatedPeriods.length === 0 && skippedPeriods.length === 0) {
    throw lastError ?? new Error("리더보드 점수를 저장하지 못했습니다.");
  }

  return {
    updatedPeriods,
    skippedPeriods,
    failedPeriods,
  };
}

export async function saveTypingLeaderboardScore({
  schoolId,
  schoolName,
  grade,
  studentName,
  score,
  elapsedSeconds,
  questionCount,
  correctCount,
  accuracy,
  hintUsedCount,
  bestCombo,
  now = new Date(),
}) {
  const { db: firestore } = ensureFirebase();
  const cleanSchoolId = normalizeLeaderboardScope(schoolId);
  const cleanSchoolName = normalizeLeaderboardText(schoolName);
  const cleanGrade = normalizeLeaderboardScope(grade);
  const cleanStudentName = normalizeStudentName(studentName);

  if (!cleanSchoolId) {
    throw new Error("School id is required.");
  }

  if (!cleanSchoolName) {
    throw new Error("School name is required.");
  }

  if (!cleanGrade) {
    throw new Error("Grade is required.");
  }

  if (!cleanStudentName) {
    throw new Error("Student name is required.");
  }

  const validatedResult = validateTypingLeaderboardResult({
    score,
    elapsedSeconds,
    questionCount,
    correctCount,
    accuracy,
    hintUsedCount,
    bestCombo,
  });

  const periodKeys = createLeaderboardPeriodKeys(now);
  const updatedPeriods = [];
  const skippedPeriods = [];
  const failedPeriods = [];
  let lastError = null;

  for (const { type } of LEADERBOARD_PERIOD_DEFINITIONS) {
    const scopeGrade = createMatchingLeaderboardGradeScope(type, cleanGrade);
    try {
      const result = await upsertTypingLeaderboardPeriod({
        firestore,
        schoolId: cleanSchoolId,
        schoolName: cleanSchoolName,
        grade: scopeGrade,
        studentName: cleanStudentName,
        periodType: type,
        periodKey: periodKeys[type],
        ...validatedResult,
      });

      if (result === "skipped") {
        skippedPeriods.push(type);
      } else {
        updatedPeriods.push(type);
      }
    } catch (error) {
      failedPeriods.push(type);
      lastError = error;
    }
  }

  if (failedPeriods.length > 0 && updatedPeriods.length === 0 && skippedPeriods.length === 0) {
    throw lastError ?? new Error("리더보드 점수를 저장하지 못했습니다.");
  }

  return {
    updatedPeriods,
    skippedPeriods,
    failedPeriods,
  };
}

export async function saveSpellingLeaderboardScore({
  schoolId,
  schoolName,
  grade,
  studentName,
  score,
  elapsedSeconds,
  questionCount,
  correctCount,
  accuracy,
  revealedCount,
  hintUsedCount,
  totalAttempts,
  now = new Date(),
}) {
  return spellingLeaderboardApi.saveSpellingLeaderboardScore({
    schoolId,
    schoolName,
    grade,
    studentName,
    score,
    elapsedSeconds,
    questionCount,
    correctCount,
    accuracy,
    revealedCount,
    hintUsedCount,
    totalAttempts,
    now,
  });
}
