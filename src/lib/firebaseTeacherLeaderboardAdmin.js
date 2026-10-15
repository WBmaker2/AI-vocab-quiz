import { createFishingLeaderboardEntryRef, createMatchingLeaderboardEntryRef, createTypingLeaderboardEntryRef, createTypingLeaderboardWritePayload, pickBetterTypingLeaderboardEntry } from "./firebaseLeaderboardPayloads.js";
import { normalizeLeaderboardScope } from "./firebaseLeaderboardValidation.js";
import { createSpellingLeaderboardApi } from "./spellingLeaderboard.js";
import { LEADERBOARD_PERIOD_DEFINITIONS, createLeaderboardPeriodKeys, normalizeStudentName, normalizeStudentNameKey } from "../utils/leaderboard.js";
import { normalizeActivityLeaderboardType } from "../utils/activityLeaderboard.js";
import { ensureFirebase } from "./firebaseCore.js";
import { runTransaction } from "firebase/firestore";

export async function renameTeacherTypingLeaderboardStudent({
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
      const oldEntry = createTypingLeaderboardEntryRef(firestore, {
        schoolId: cleanSchoolId,
        grade: scopeGrade,
        periodType: type,
        periodKey,
        studentName: cleanOldStudentName,
      });
      const newEntry = createTypingLeaderboardEntryRef(firestore, {
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
      const winner = pickBetterTypingLeaderboardEntry(newData, oldData);

      if (newData && winner === newData) {
        transaction.delete(oldEntry.ref);
        keptPeriods.push(type);
        continue;
      }

      const mergedPayload = createTypingLeaderboardWritePayload({
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

export async function renameTeacherSpellingLeaderboardStudent({
  schoolId,
  grade,
  oldStudentName,
  newStudentName,
  now = new Date(),
}) {
  return spellingLeaderboardApi.renameTeacherSpellingLeaderboardStudent({
    schoolId,
    grade,
    oldStudentName,
    newStudentName,
    now,
  });
}

export async function deleteTeacherMatchingLeaderboardStudent({
  schoolId,
  grade,
  studentName,
  now = new Date(),
}) {
  const { db: firestore } = ensureFirebase();
  const cleanSchoolId = normalizeLeaderboardScope(schoolId);
  const cleanGrade = normalizeLeaderboardScope(grade);
  const cleanStudentName = normalizeStudentName(studentName);

  if (!cleanSchoolId) {
    throw new Error("School id is required.");
  }

  if (!cleanGrade) {
    throw new Error("Grade is required.");
  }

  if (!cleanStudentName) {
    throw new Error("Student name is required.");
  }

  const periodKeys = createLeaderboardPeriodKeys(now);
  const deletedPeriods = [];
  const skippedPeriods = [];
  await runTransaction(firestore, async (transaction) => {
    const periodSnapshots = [];

    for (const { type } of LEADERBOARD_PERIOD_DEFINITIONS) {
      const periodKey = periodKeys[type];
      const scopeGrade = createMatchingLeaderboardGradeScope(type, cleanGrade);
      const entry = createMatchingLeaderboardEntryRef(firestore, {
        schoolId: cleanSchoolId,
        grade: scopeGrade,
        periodType: type,
        periodKey,
        studentName: cleanStudentName,
      });

      const snapshot = await transaction.get(entry.ref);
      periodSnapshots.push({
        type,
        entry,
        snapshot,
      });
    }

    for (const periodSnapshot of periodSnapshots) {
      const { type, entry, snapshot } = periodSnapshot;

      if (!snapshot.exists()) {
        skippedPeriods.push(type);
        continue;
      }

      transaction.delete(entry.ref);
      deletedPeriods.push(type);
    }
  });

  return {
    deletedPeriods,
    skippedPeriods,
  };
}

export async function deleteTeacherFishingLeaderboardStudent({
  schoolId,
  grade,
  studentName,
  now = new Date(),
}) {
  const { db: firestore } = ensureFirebase();
  const cleanSchoolId = normalizeLeaderboardScope(schoolId);
  const cleanGrade = normalizeLeaderboardScope(grade);
  const cleanStudentName = normalizeStudentName(studentName);

  if (!cleanSchoolId) {
    throw new Error("School id is required.");
  }

  if (!cleanGrade) {
    throw new Error("Grade is required.");
  }

  if (!cleanStudentName) {
    throw new Error("Student name is required.");
  }

  const periodKeys = createLeaderboardPeriodKeys(now);
  const deletedPeriods = [];
  const skippedPeriods = [];
  await runTransaction(firestore, async (transaction) => {
    const periodSnapshots = [];

    for (const { type } of LEADERBOARD_PERIOD_DEFINITIONS) {
      const periodKey = periodKeys[type];
      const scopeGrade = createMatchingLeaderboardGradeScope(type, cleanGrade);
      const entry = createFishingLeaderboardEntryRef(firestore, {
        schoolId: cleanSchoolId,
        grade: scopeGrade,
        periodType: type,
        periodKey,
        studentName: cleanStudentName,
      });

      const snapshot = await transaction.get(entry.ref);
      periodSnapshots.push({
        type,
        entry,
        snapshot,
      });
    }

    for (const periodSnapshot of periodSnapshots) {
      const { type, entry, snapshot } = periodSnapshot;

      if (!snapshot.exists()) {
        skippedPeriods.push(type);
        continue;
      }

      transaction.delete(entry.ref);
      deletedPeriods.push(type);
    }
  });

  return {
    deletedPeriods,
    skippedPeriods,
  };
}

export async function deleteTeacherTypingLeaderboardStudent({
  schoolId,
  grade,
  studentName,
  now = new Date(),
}) {
  const { db: firestore } = ensureFirebase();
  const cleanSchoolId = normalizeLeaderboardScope(schoolId);
  const cleanGrade = normalizeLeaderboardScope(grade);
  const cleanStudentName = normalizeStudentName(studentName);

  if (!cleanSchoolId) {
    throw new Error("School id is required.");
  }

  if (!cleanGrade) {
    throw new Error("Grade is required.");
  }

  if (!cleanStudentName) {
    throw new Error("Student name is required.");
  }

  const periodKeys = createLeaderboardPeriodKeys(now);
  const deletedPeriods = [];
  const skippedPeriods = [];
  await runTransaction(firestore, async (transaction) => {
    const periodSnapshots = [];

    for (const { type } of LEADERBOARD_PERIOD_DEFINITIONS) {
      const periodKey = periodKeys[type];
      const scopeGrade = createMatchingLeaderboardGradeScope(type, cleanGrade);
      const entry = createTypingLeaderboardEntryRef(firestore, {
        schoolId: cleanSchoolId,
        grade: scopeGrade,
        periodType: type,
        periodKey,
        studentName: cleanStudentName,
      });

      const snapshot = await transaction.get(entry.ref);
      periodSnapshots.push({
        type,
        entry,
        snapshot,
      });
    }

    for (const periodSnapshot of periodSnapshots) {
      const { type, entry, snapshot } = periodSnapshot;

      if (!snapshot.exists()) {
        skippedPeriods.push(type);
        continue;
      }

      transaction.delete(entry.ref);
      deletedPeriods.push(type);
    }
  });

  return {
    deletedPeriods,
    skippedPeriods,
  };
}

export async function deleteTeacherSpellingLeaderboardStudent({
  schoolId,
  grade,
  studentName,
  now = new Date(),
}) {
  return spellingLeaderboardApi.deleteTeacherSpellingLeaderboardStudent({
    schoolId,
    grade,
    studentName,
    now,
  });
}

export async function deleteTeacherActivityLeaderboardStudent({
  activityType,
  schoolId,
  grade,
  studentName,
  now = new Date(),
}) {
  const normalizedActivityType = normalizeActivityLeaderboardType(activityType);

  if (normalizedActivityType === "typing") {
    return deleteTeacherTypingLeaderboardStudent({
      schoolId,
      grade,
      studentName,
      now,
    });
  }

  if (normalizedActivityType === "spelling") {
    return deleteTeacherSpellingLeaderboardStudent({
      schoolId, grade, studentName, now,
    });
  }

  if (normalizedActivityType === "fishing") {
    return deleteTeacherFishingLeaderboardStudent({
      schoolId,
      grade,
      studentName,
      now,
    });
  }

  return deleteTeacherMatchingLeaderboardStudent({
    schoolId,
    grade,
    studentName,
    now,
  });
}
export const spellingLeaderboardApi = createSpellingLeaderboardApi({
  ensureFirestore: () => ensureFirebase().db,
});
