import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import {
  LEADERBOARD_PERIOD_DEFINITIONS,
  createLeaderboardPeriodKeys,
  createMatchingLeaderboardGradeScope,
  createMatchingLeaderboardScopeKey,
  normalizeStudentName,
  normalizeStudentNameKey,
} from "../utils/leaderboard.js";

function normalizeScope(value) {
  return String(value ?? "").trim();
}

function normalizeText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function validateNumber(value, fieldName, { min = 0, max = Infinity } = {}) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < min || numberValue > max) {
    throw new Error(`${fieldName} is out of range.`);
  }

  return numberValue;
}

function validateInteger(value, fieldName, options = {}) {
  const numberValue = validateNumber(value, fieldName, options);

  if (!Number.isInteger(numberValue)) {
    throw new Error(`${fieldName} must be an integer.`);
  }

  return numberValue;
}

export function validateSpellingLeaderboardResult({
  score,
  elapsedSeconds,
  questionCount,
  correctCount,
  accuracy,
  revealedCount,
  totalAttempts,
}) {
  const cleanQuestionCount = validateInteger(questionCount, "questionCount", {
    min: 1,
    max: 500,
  });
  const cleanCorrectCount = validateInteger(correctCount, "correctCount", {
    min: 0,
    max: cleanQuestionCount,
  });
  const cleanRevealedCount = validateInteger(revealedCount, "revealedCount", {
    min: 0,
    max: cleanQuestionCount,
  });

  if (cleanCorrectCount + cleanRevealedCount !== cleanQuestionCount) {
    throw new Error("correctCount and revealedCount must cover questionCount.");
  }

  const cleanTotalAttempts = validateInteger(totalAttempts, "totalAttempts", {
    min: cleanCorrectCount + cleanRevealedCount * 3,
    max: cleanQuestionCount * 3,
  });
  const cleanAccuracy = validateInteger(accuracy, "accuracy", { min: 0, max: 100 });

  if (Math.abs(cleanAccuracy * cleanQuestionCount - cleanCorrectCount * 100) > cleanQuestionCount) {
    throw new Error("accuracy does not match correctCount.");
  }

  const cleanScore = validateInteger(score, "score", {
    min: 0,
    max: cleanQuestionCount * 100,
  });
  const expectedScore = (
    cleanQuestionCount * 100
    + cleanCorrectCount * 30
    - cleanTotalAttempts * 30
  );

  if (cleanScore !== expectedScore) {
    throw new Error("score does not match spelling attempts.");
  }

  return {
    score: cleanScore,
    elapsedSeconds: validateInteger(elapsedSeconds, "elapsedSeconds", {
      min: 0,
      max: 86400,
    }),
    questionCount: cleanQuestionCount,
    correctCount: cleanCorrectCount,
    accuracy: cleanAccuracy,
    revealedCount: cleanRevealedCount,
    totalAttempts: cleanTotalAttempts,
  };
}

export function pickBetterSpellingLeaderboardEntry(left, right) {
  if (!left) return right ?? null;
  if (!right) return left;

  const comparisons = [
    Number(right.score ?? 0) - Number(left.score ?? 0),
    Number(right.correctCount ?? 0) - Number(left.correctCount ?? 0),
    Number(left.totalAttempts ?? Number.POSITIVE_INFINITY)
      - Number(right.totalAttempts ?? Number.POSITIVE_INFINITY),
    Number(left.elapsedSeconds ?? Number.POSITIVE_INFINITY)
      - Number(right.elapsedSeconds ?? Number.POSITIVE_INFINITY),
    (toMillis(right.updatedAt) || toMillis(right.createdAt))
      - (toMillis(left.updatedAt) || toMillis(left.createdAt)),
  ];
  const firstDifference = comparisons.find((value) => value !== 0);

  return firstDifference === undefined || firstDifference <= 0 ? left : right;
}

function toMillis(value) {
  if (typeof value?.toMillis === "function") return value.toMillis();
  return value?.seconds == null ? 0 : Number(value.seconds) * 1000;
}

function createSpellingLeaderboardPayload({
  schoolId,
  schoolName,
  grade,
  studentName,
  periodType,
  periodKey,
  ...result
}) {
  const cleanSchoolId = normalizeScope(schoolId);
  const cleanGrade = normalizeScope(grade);
  const cleanStudentName = normalizeText(studentName);

  return {
    scopeKey: createMatchingLeaderboardScopeKey({
      schoolId: cleanSchoolId,
      grade: cleanGrade,
      periodType,
      periodKey,
    }),
    schoolId: cleanSchoolId,
    schoolName: normalizeText(schoolName),
    grade: cleanGrade,
    studentName: cleanStudentName,
    studentNameNormalized: normalizeStudentNameKey(cleanStudentName),
    periodType,
    periodKey,
    ...validateSpellingLeaderboardResult(result),
  };
}

function createEntryRef(firestore, {
  schoolId,
  grade,
  periodType,
  periodKey,
  studentName,
}) {
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
    ref: doc(firestore, "spellingLeaderboards", scopeKey, "entries", studentKey),
  };
}

function createWritePayload({ source, schoolId, schoolName, grade, studentName, periodType, periodKey }) {
  return {
    ...createSpellingLeaderboardPayload({
      schoolId,
      schoolName: normalizeText(source.schoolName ?? schoolName),
      grade,
      studentName: normalizeText(studentName),
      periodType,
      periodKey,
      score: source.score,
      elapsedSeconds: source.elapsedSeconds,
      questionCount: source.questionCount,
      correctCount: source.correctCount,
      accuracy: source.accuracy,
      revealedCount: source.revealedCount,
      totalAttempts: source.totalAttempts,
    }),
    createdAt: source.createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

async function upsertPeriod({ firestore, ...input }) {
  const payload = createSpellingLeaderboardPayload(input);
  const leaderboardRef = doc(
    firestore,
    "spellingLeaderboards",
    payload.scopeKey,
    "entries",
    payload.studentNameNormalized,
  );

  return runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(leaderboardRef);
    if (!snapshot.exists()) {
      transaction.set(leaderboardRef, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return "created";
    }

    const nextData = { ...snapshot.data(), ...payload };
    if (pickBetterSpellingLeaderboardEntry(snapshot.data(), nextData) === nextData) {
      transaction.update(leaderboardRef, {
        score: payload.score,
        elapsedSeconds: payload.elapsedSeconds,
        questionCount: payload.questionCount,
        correctCount: payload.correctCount,
        accuracy: payload.accuracy,
        revealedCount: payload.revealedCount,
        totalAttempts: payload.totalAttempts,
        updatedAt: serverTimestamp(),
      });
      return "updated";
    }

    return "skipped";
  });
}

async function fetchPeriod({ firestore, schoolId, grade, periodType, periodKey, limitCount }) {
  const cleanSchoolId = normalizeScope(schoolId);
  const cleanGrade = normalizeScope(grade);
  const scopeKey = createMatchingLeaderboardScopeKey({
    schoolId: cleanSchoolId,
    grade: cleanGrade,
    periodType,
    periodKey,
  });
  if (!cleanSchoolId || !cleanGrade || !periodKey || !scopeKey) {
    return { periodType, periodKey, entries: [] };
  }

  const snapshot = await getDocs(query(
    collection(firestore, "spellingLeaderboards", scopeKey, "entries"),
  ));
  const entries = snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((left, right) => {
      const winner = pickBetterSpellingLeaderboardEntry(left, right);
      return winner === right ? 1 : winner === left ? -1 : 0;
    })
    .slice(0, limitCount)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return { periodType, periodKey, entries };
}

export function createSpellingLeaderboardApi({ ensureFirestore }) {
  async function fetchSpellingLeaderboards({ schoolId, grade, now = new Date(), limitCount = 10 }) {
    const firestore = ensureFirestore();
    const periodKeys = createLeaderboardPeriodKeys(now);
    const entries = await Promise.all(
      LEADERBOARD_PERIOD_DEFINITIONS.map(async ({ type, label }) => {
        const period = await fetchPeriod({
          firestore,
          schoolId,
          grade: createMatchingLeaderboardGradeScope(type, grade),
          periodType: type,
          periodKey: periodKeys[type],
          limitCount,
        });
        return [type, { periodType: type, periodKey: period.periodKey, label, entries: period.entries }];
      }),
    );
    return Object.fromEntries(entries);
  }

  async function saveSpellingLeaderboardScore({ schoolId, schoolName, grade, studentName, now = new Date(), ...result }) {
    const firestore = ensureFirestore();
    const cleanSchoolId = normalizeScope(schoolId);
    const cleanSchoolName = normalizeText(schoolName);
    const cleanGrade = normalizeScope(grade);
    const cleanStudentName = normalizeStudentName(studentName);
    if (!cleanSchoolId) throw new Error("School id is required.");
    if (!cleanSchoolName) throw new Error("School name is required.");
    if (!cleanGrade) throw new Error("Grade is required.");
    if (!cleanStudentName) throw new Error("Student name is required.");

    const validatedResult = validateSpellingLeaderboardResult(result);
    const periodKeys = createLeaderboardPeriodKeys(now);
    const updatedPeriods = [];
    const skippedPeriods = [];
    const failedPeriods = [];
    let lastError = null;

    for (const { type } of LEADERBOARD_PERIOD_DEFINITIONS) {
      try {
        const outcome = await upsertPeriod({
          firestore,
          schoolId: cleanSchoolId,
          schoolName: cleanSchoolName,
          grade: createMatchingLeaderboardGradeScope(type, cleanGrade),
          studentName: cleanStudentName,
          periodType: type,
          periodKey: periodKeys[type],
          ...validatedResult,
        });
        (outcome === "skipped" ? skippedPeriods : updatedPeriods).push(type);
      } catch (error) {
        failedPeriods.push(type);
        lastError = error;
      }
    }

    if (failedPeriods.length > 0 && updatedPeriods.length === 0 && skippedPeriods.length === 0) {
      throw lastError ?? new Error("리더보드 점수를 저장하지 못했습니다.");
    }

    return { updatedPeriods, skippedPeriods, failedPeriods };
  }

  async function renameTeacherSpellingLeaderboardStudent({
    schoolId,
    grade,
    oldStudentName,
    newStudentName,
    now = new Date(),
  }) {
    const firestore = ensureFirestore();
    const cleanSchoolId = normalizeScope(schoolId);
    const cleanGrade = normalizeScope(grade);
    const cleanOldStudentName = normalizeStudentName(oldStudentName);
    const cleanNewStudentName = normalizeStudentName(newStudentName);
    if (!cleanSchoolId || !cleanGrade || !cleanOldStudentName || !cleanNewStudentName) {
      throw new Error("School, grade, and student names are required.");
    }
    if (normalizeStudentNameKey(cleanOldStudentName) === normalizeStudentNameKey(cleanNewStudentName)) {
      throw new Error("The new student name must be different from the current name.");
    }

    const updatedPeriods = [];
    const keptPeriods = [];
    const skippedPeriods = [];
    const periodKeys = createLeaderboardPeriodKeys(now);
    await runTransaction(firestore, async (transaction) => {
      const snapshots = [];
      for (const { type } of LEADERBOARD_PERIOD_DEFINITIONS) {
        const periodKey = periodKeys[type];
        const gradeScope = createMatchingLeaderboardGradeScope(type, cleanGrade);
        const oldEntry = createEntryRef(firestore, {
          schoolId: cleanSchoolId, grade: gradeScope, periodType: type, periodKey, studentName: cleanOldStudentName,
        });
        const newEntry = createEntryRef(firestore, {
          schoolId: cleanSchoolId, grade: gradeScope, periodType: type, periodKey, studentName: cleanNewStudentName,
        });
        snapshots.push({
          type, periodKey, gradeScope, oldEntry, newEntry,
          oldSnapshot: await transaction.get(oldEntry.ref),
          newSnapshot: await transaction.get(newEntry.ref),
        });
      }

      for (const entry of snapshots) {
        if (!entry.oldSnapshot.exists()) {
          skippedPeriods.push(entry.type);
          continue;
        }
        const oldData = entry.oldSnapshot.data();
        const newData = entry.newSnapshot.exists() ? entry.newSnapshot.data() : null;
        const winner = pickBetterSpellingLeaderboardEntry(newData, oldData);
        if (newData && winner === newData) {
          transaction.delete(entry.oldEntry.ref);
          keptPeriods.push(entry.type);
          continue;
        }
        transaction.set(entry.newEntry.ref, createWritePayload({
          source: winner ?? oldData,
          schoolId: cleanSchoolId,
          schoolName: oldData.schoolName ?? newData?.schoolName ?? "",
          grade: entry.gradeScope,
          studentName: cleanNewStudentName,
          periodType: entry.type,
          periodKey: entry.periodKey,
        }));
        transaction.delete(entry.oldEntry.ref);
        updatedPeriods.push(entry.type);
      }
    });
    return { updatedPeriods, keptPeriods, skippedPeriods };
  }

  async function deleteTeacherSpellingLeaderboardStudent({ schoolId, grade, studentName, now = new Date() }) {
    const firestore = ensureFirestore();
    const cleanSchoolId = normalizeScope(schoolId);
    const cleanGrade = normalizeScope(grade);
    const cleanStudentName = normalizeStudentName(studentName);
    if (!cleanSchoolId || !cleanGrade || !cleanStudentName) {
      throw new Error("School, grade, and student name are required.");
    }

    const deletedPeriods = [];
    const skippedPeriods = [];
    const periodKeys = createLeaderboardPeriodKeys(now);
    await runTransaction(firestore, async (transaction) => {
      const snapshots = [];
      for (const { type } of LEADERBOARD_PERIOD_DEFINITIONS) {
        const entry = createEntryRef(firestore, {
          schoolId: cleanSchoolId,
          grade: createMatchingLeaderboardGradeScope(type, cleanGrade),
          periodType: type,
          periodKey: periodKeys[type],
          studentName: cleanStudentName,
        });
        snapshots.push({ type, entry, snapshot: await transaction.get(entry.ref) });
      }
      for (const { type, entry, snapshot } of snapshots) {
        if (!snapshot.exists()) {
          skippedPeriods.push(type);
        } else {
          transaction.delete(entry.ref);
          deletedPeriods.push(type);
        }
      }
    });
    return { deletedPeriods, skippedPeriods };
  }

  return {
    fetchSpellingLeaderboards,
    saveSpellingLeaderboardScore,
    renameTeacherSpellingLeaderboardStudent,
    deleteTeacherSpellingLeaderboardStudent,
  };
}
