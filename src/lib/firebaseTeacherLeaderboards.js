import { createFishingLeaderboardEntryRef, createFishingLeaderboardWritePayload, createMatchingLeaderboardEntryRef, createMatchingLeaderboardWritePayload } from "./firebaseLeaderboardPayloads.js";
import { renameTeacherSpellingLeaderboardStudent, renameTeacherTypingLeaderboardStudent } from "./firebaseTeacherLeaderboardAdmin.js";
import { fetchSpellingLeaderboards } from "./firebaseLeaderboardScores.js";
import { normalizeLeaderboardScope } from "./firebaseLeaderboardValidation.js";
import { LEADERBOARD_PERIOD_DEFINITIONS, createLeaderboardPeriodKeys, normalizeStudentName, normalizeStudentNameKey, pickBetterMatchingLeaderboardEntry } from "../utils/leaderboard.js";
import { normalizeActivityLeaderboardType } from "../utils/activityLeaderboard.js";
import { ensureFirebase } from "./firebaseCore.js";
import { runTransaction } from "firebase/firestore";

export async function fetchTeacherActivityLeaderboards({
  activityType,
  schoolId,
  grade,
  now = new Date(),
  limitCount = 20,
}) {
  const normalizedActivityType = normalizeActivityLeaderboardType(activityType);

  if (normalizedActivityType === "typing") {
    return fetchTypingLeaderboards({ schoolId, grade, now, limitCount });
  }

  if (normalizedActivityType === "spelling") {
    return fetchSpellingLeaderboards({ schoolId, grade, now, limitCount });
  }

  if (normalizedActivityType === "fishing") {
    return fetchFishingLeaderboards({ schoolId, grade, now, limitCount });
  }

  return fetchMatchingLeaderboards({ schoolId, grade, now, limitCount });
}

export async function fetchTeacherMatchingLeaderboards({
  schoolId,
  grade,
  now = new Date(),
  limitCount = 20,
}) {
  return fetchMatchingLeaderboards({
    schoolId,
    grade,
    now,
    limitCount,
  });
}

export async function fetchTeacherFishingLeaderboards({
  schoolId,
  grade,
  now = new Date(),
  limitCount = 20,
}) {
  return fetchFishingLeaderboards({
    schoolId,
    grade,
    now,
    limitCount,
  });
}

export async function fetchTeacherTypingLeaderboards({
  schoolId,
  grade,
  now = new Date(),
  limitCount = 20,
}) {
  return fetchTypingLeaderboards({
    schoolId,
    grade,
    now,
    limitCount,
  });
}

export async function fetchTeacherSpellingLeaderboards({
  schoolId,
  grade,
  now = new Date(),
  limitCount = 20,
}) {
  return fetchSpellingLeaderboards({ schoolId, grade, now, limitCount });
}

export async function renameTeacherMatchingLeaderboardStudent({
  schoolId,
  grade,
  oldStudentName,
  newStudentName,
  now = new Date(),
}) {
  const { db: firestore } = ensureFirebase();
  const cleanSchoolId = normalizeLeaderboardScope(schoolId);
  const cleanGrade = normalizeLeaderboardScope(grade);
  const cleanOldStudentName = normalizeStudentName(oldStudentName);
  const cleanNewStudentName = normalizeStudentName(newStudentName);
  const oldStudentKey = normalizeStudentNameKey(cleanOldStudentName);
  const newStudentKey = normalizeStudentNameKey(cleanNewStudentName);

  if (!cleanSchoolId) {
    throw new Error("School id is required.");
  }

  if (!cleanGrade) {
    throw new Error("Grade is required.");
  }

  if (!cleanOldStudentName) {
    throw new Error("Existing student name is required.");
  }

  if (!cleanNewStudentName) {
    throw new Error("New student name is required.");
  }

  if (oldStudentKey === newStudentKey) {
    throw new Error("The new student name must be different from the current name.");
  }

  const periodKeys = createLeaderboardPeriodKeys(now);
  const updatedPeriods = [];
  const keptPeriods = [];
  const skippedPeriods = [];
  await runTransaction(firestore, async (transaction) => {
    const periodSnapshots = [];

    for (const { type } of LEADERBOARD_PERIOD_DEFINITIONS) {
      const periodKey = periodKeys[type];
      const scopeGrade = createMatchingLeaderboardGradeScope(type, cleanGrade);
      const oldEntry = createMatchingLeaderboardEntryRef(firestore, {
        schoolId: cleanSchoolId,
        grade: scopeGrade,
        periodType: type,
        periodKey,
        studentName: cleanOldStudentName,
      });
      const newEntry = createMatchingLeaderboardEntryRef(firestore, {
        schoolId: cleanSchoolId,
        grade: scopeGrade,
        periodType: type,
        periodKey,
        studentName: cleanNewStudentName,
      });

      const oldSnapshot = await transaction.get(oldEntry.ref);
      const newSnapshot = await transaction.get(newEntry.ref);
      periodSnapshots.push({
        type,
        periodKey,
        scopeGrade,
        oldEntry,
        newEntry,
        oldSnapshot,
        newSnapshot,
      });
    }

    for (const periodSnapshot of periodSnapshots) {
      const {
        type,
        periodKey,
        scopeGrade,
        oldEntry,
        newEntry,
        oldSnapshot,
        newSnapshot,
      } =
        periodSnapshot;

      if (!oldSnapshot.exists()) {
        skippedPeriods.push(type);
        continue;
      }

      const oldData = oldSnapshot.data();
      const newData = newSnapshot.exists() ? newSnapshot.data() : null;
      const winner = pickBetterMatchingLeaderboardEntry(newData, oldData);

      if (newData && winner === newData) {
        transaction.delete(oldEntry.ref);
        keptPeriods.push(type);
        continue;
      }

      const mergedPayload = createMatchingLeaderboardWritePayload({
        source: winner ?? oldData,
        schoolId: cleanSchoolId,
        schoolName: oldData.schoolName ?? newData?.schoolName ?? "",
        grade: scopeGrade,
        studentName: cleanNewStudentName,
        periodType: type,
        periodKey,
      });

      transaction.set(newEntry.ref, mergedPayload);
      transaction.delete(oldEntry.ref);
      updatedPeriods.push(type);
    }
  });

  return {
    updatedPeriods,
    keptPeriods,
    skippedPeriods,
  };
}

export async function renameTeacherActivityLeaderboardStudent({
  activityType,
  schoolId,
  grade,
  oldStudentName,
  newStudentName,
  now = new Date(),
}) {
  const normalizedActivityType = normalizeActivityLeaderboardType(activityType);

  if (normalizedActivityType === "typing") {
    return renameTeacherTypingLeaderboardStudent({
      schoolId,
      grade,
      oldStudentName,
      newStudentName,
      now,
    });
  }

  if (normalizedActivityType === "spelling") {
    return renameTeacherSpellingLeaderboardStudent({
      schoolId,
      grade,
      oldStudentName,
      newStudentName,
      now,
    });
  }

  if (normalizedActivityType === "fishing") {
    return renameTeacherFishingLeaderboardStudent({
      schoolId,
      grade,
      oldStudentName,
      newStudentName,
      now,
    });
  }

  return renameTeacherMatchingLeaderboardStudent({
    schoolId,
    grade,
    oldStudentName,
    newStudentName,
    now,
  });
}

export async function renameTeacherFishingLeaderboardStudent({
  schoolId,
  grade,
  oldStudentName,
  newStudentName,
  now = new Date(),
}) {
  const { db: firestore } = ensureFirebase();
  const cleanSchoolId = normalizeLeaderboardScope(schoolId);
  const cleanGrade = normalizeLeaderboardScope(grade);
  const cleanOldStudentName = normalizeStudentName(oldStudentName);
  const cleanNewStudentName = normalizeStudentName(newStudentName);
  const oldStudentKey = normalizeStudentNameKey(cleanOldStudentName);
  const newStudentKey = normalizeStudentNameKey(cleanNewStudentName);

  if (!cleanSchoolId) {
    throw new Error("School id is required.");
  }

  if (!cleanGrade) {
    throw new Error("Grade is required.");
  }

  if (!cleanOldStudentName) {
    throw new Error("Existing student name is required.");
  }

  if (!cleanNewStudentName) {
    throw new Error("New student name is required.");
  }

  if (oldStudentKey === newStudentKey) {
    throw new Error("The new student name must be different from the current name.");
  }

  const periodKeys = createLeaderboardPeriodKeys(now);
  const updatedPeriods = [];
  const keptPeriods = [];
  const skippedPeriods = [];
  await runTransaction(firestore, async (transaction) => {
    const periodSnapshots = [];

    for (const { type } of LEADERBOARD_PERIOD_DEFINITIONS) {
      const periodKey = periodKeys[type];
      const scopeGrade = createMatchingLeaderboardGradeScope(type, cleanGrade);
      const oldEntry = createFishingLeaderboardEntryRef(firestore, {
        schoolId: cleanSchoolId,
        grade: scopeGrade,
        periodType: type,
        periodKey,
        studentName: cleanOldStudentName,
      });
      const newEntry = createFishingLeaderboardEntryRef(firestore, {
        schoolId: cleanSchoolId,
        grade: scopeGrade,
        periodType: type,
        periodKey,
        studentName: cleanNewStudentName,
      });

      const oldSnapshot = await transaction.get(oldEntry.ref);
      const newSnapshot = await transaction.get(newEntry.ref);
      periodSnapshots.push({
        type,
        periodKey,
        scopeGrade,
        oldEntry,
        newEntry,
        oldSnapshot,
        newSnapshot,
      });
    }

    for (const periodSnapshot of periodSnapshots) {
      const {
        type,
        periodKey,
        scopeGrade,
        oldEntry,
        newEntry,
        oldSnapshot,
        newSnapshot,
      } = periodSnapshot;

      if (!oldSnapshot.exists()) {
        skippedPeriods.push(type);
        continue;
      }

      const oldData = oldSnapshot.data();
      const newData = newSnapshot.exists() ? newSnapshot.data() : null;
      const winner = pickBetterMatchingLeaderboardEntry(newData, oldData);

      if (newData && winner === newData) {
        transaction.delete(oldEntry.ref);
        keptPeriods.push(type);
        continue;
      }

      const mergedPayload = createFishingLeaderboardWritePayload({
        source: winner ?? oldData,
        schoolId: cleanSchoolId,
        schoolName: oldData.schoolName ?? newData?.schoolName ?? "",
        grade: scopeGrade,
        studentName: cleanNewStudentName,
        periodType: type,
        periodKey,
      });

      transaction.set(newEntry.ref, mergedPayload);
      transaction.delete(oldEntry.ref);
      updatedPeriods.push(type);
    }
  });

  return {
    updatedPeriods,
    keptPeriods,
    skippedPeriods,
  };
}
