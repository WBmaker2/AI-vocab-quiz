import { initializeApp, getApps } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  deleteDoc,
} from "firebase/firestore";
import {
  LEADERBOARD_PERIOD_DEFINITIONS,
  createLeaderboardPeriodKeys,
  createMatchingLeaderboardGradeScope,
  createMatchingLeaderboardScopeKey,
  normalizeStudentName,
  normalizeStudentNameKey,
  pickBetterMatchingLeaderboardEntry,
} from "../utils/leaderboard";
import { BADGE_IDS } from "../constants/badges.js";
import {
  buildProgressSummary,
  compareListeningProgress,
  compareMatchingProgress,
  compareSpeakingProgress,
  createStudentProfileId,
  evaluateEarnedBadges,
  normalizeStudentProfileName,
} from "../utils/studentProgress.js";

function getEnvValue(name) {
  return String(import.meta.env[name] ?? "").trim();
}

const firebaseConfig = {
  apiKey: getEnvValue("VITE_FIREBASE_API_KEY"),
  authDomain: getEnvValue("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnvValue("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: getEnvValue("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnvValue("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnvValue("VITE_FIREBASE_APP_ID"),
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
);

const app = isFirebaseConfigured
  ? getApps()[0] ?? initializeApp(firebaseConfig)
  : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

if (auth) {
  setPersistence(auth, browserLocalPersistence).catch(() => {});
}

function ensureFirebase() {
  if (!auth || !db) {
    throw new Error("Firebase environment variables are not configured.");
  }

  return { auth, db };
}

function normalizeLeaderboardScope(value) {
  return String(value ?? "").trim();
}

function normalizeLeaderboardText(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function toNonNegativeInteger(value, fieldName) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }

  return Math.max(0, Math.floor(numberValue));
}

const STUDENT_PROGRESS_ACTIVITY_TYPES = new Set([
  "listening",
  "speaking",
  "matching",
]);

const STUDENT_BADGE_ID_SET = new Set(BADGE_IDS);

function normalizeStudentProgressSchoolName(value) {
  return normalizeLeaderboardText(value);
}

function normalizeStudentProgressGrade(value) {
  return normalizeLeaderboardScope(value);
}

function normalizeStudentProgressActivityType(value) {
  return String(value ?? "").trim().toLowerCase();
}

function isStudentProgressActivityType(value) {
  return STUDENT_PROGRESS_ACTIVITY_TYPES.has(
    normalizeStudentProgressActivityType(value),
  );
}

function createStudentProgressRef(firestore, { schoolId, grade, studentName }) {
  return doc(
    firestore,
    "studentProfiles",
    createStudentProfileId({
      schoolId,
      grade,
      studentName,
    }),
  );
}

function normalizeStudentProfileDocument(snapshotData, fallback) {
  const cleanFallback = fallback ?? {};
  const studentName = normalizeStudentProfileName(
    snapshotData?.studentName ?? cleanFallback.studentName,
  );
  const schoolId = normalizeLeaderboardScope(
    snapshotData?.schoolId ?? cleanFallback.schoolId,
  );
  const schoolName = normalizeStudentProgressSchoolName(
    snapshotData?.schoolName ?? cleanFallback.schoolName,
  );
  const grade = normalizeStudentProgressGrade(
    snapshotData?.grade ?? cleanFallback.grade,
  );
  const studentNameNormalized = normalizeStudentNameKey(studentName);
  const totalSessions = toNonNegativeInteger(snapshotData?.totalSessions ?? 0);
  const earnedBadges = Array.from(
    new Set(
      Array.isArray(snapshotData?.earnedBadges)
        ? snapshotData.earnedBadges
            .map((badgeId) => String(badgeId ?? "").trim())
            .filter((badgeId) => badgeId && STUDENT_BADGE_ID_SET.has(badgeId))
        : [],
    ),
  );

  return {
    schoolId,
    schoolName,
    grade,
    studentName,
    studentNameNormalized,
    totalSessions,
    listeningSessions: toNonNegativeInteger(
      snapshotData?.listeningSessions ?? 0,
    ),
    speakingSessions: toNonNegativeInteger(
      snapshotData?.speakingSessions ?? 0,
    ),
    matchingSessions: toNonNegativeInteger(
      snapshotData?.matchingSessions ?? 0,
    ),
    listeningBestScore: toNonNegativeInteger(
      snapshotData?.listeningBestScore ?? 0,
    ),
    listeningBestCorrectCount: toNonNegativeInteger(
      snapshotData?.listeningBestCorrectCount ?? 0,
    ),
    speakingBestScore: toNonNegativeInteger(
      snapshotData?.speakingBestScore ?? 0,
    ),
    speakingBestCorrectCount: toNonNegativeInteger(
      snapshotData?.speakingBestCorrectCount ?? 0,
    ),
    matchingBestScore: toNonNegativeInteger(
      snapshotData?.matchingBestScore ?? 0,
    ),
    matchingBestTime: toNonNegativeInteger(snapshotData?.matchingBestTime ?? 0),
    earnedBadges,
    createdAt: snapshotData?.createdAt ?? cleanFallback.createdAt ?? null,
    updatedAt: snapshotData?.updatedAt ?? cleanFallback.updatedAt ?? null,
  };
}

function createNextStudentProfile({
  currentProfile,
  schoolId,
  schoolName,
  grade,
  studentName,
  activityType,
  comparisonResult,
  newlyEarnedBadges,
}) {
  const nextProfile = {
    schoolId,
    schoolName,
    grade,
    studentName,
    studentNameNormalized: normalizeStudentNameKey(studentName),
    totalSessions: currentProfile.totalSessions + 1,
    listeningSessions: currentProfile.listeningSessions,
    speakingSessions: currentProfile.speakingSessions,
    matchingSessions: currentProfile.matchingSessions,
    listeningBestScore: currentProfile.listeningBestScore,
    listeningBestCorrectCount: currentProfile.listeningBestCorrectCount,
    speakingBestScore: currentProfile.speakingBestScore,
    speakingBestCorrectCount: currentProfile.speakingBestCorrectCount,
    matchingBestScore: currentProfile.matchingBestScore,
    matchingBestTime: currentProfile.matchingBestTime,
    earnedBadges: Array.from(
      new Set([...currentProfile.earnedBadges, ...newlyEarnedBadges]),
    ),
    createdAt: currentProfile.createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (activityType === "listening" && comparisonResult.isNewBest) {
    nextProfile.listeningSessions += 1;
    nextProfile.listeningBestScore = comparisonResult.bestValue.score;
    nextProfile.listeningBestCorrectCount = comparisonResult.bestValue.correctCount;
  } else if (activityType === "listening") {
    nextProfile.listeningSessions += 1;
  }

  if (activityType === "speaking" && comparisonResult.isNewBest) {
    nextProfile.speakingSessions += 1;
    nextProfile.speakingBestScore = comparisonResult.bestValue.score;
    nextProfile.speakingBestCorrectCount = comparisonResult.bestValue.correctCount;
  } else if (activityType === "speaking") {
    nextProfile.speakingSessions += 1;
  }

  if (activityType === "matching" && comparisonResult.isNewBest) {
    nextProfile.matchingSessions += 1;
    nextProfile.matchingBestScore = comparisonResult.bestValue.score;
    nextProfile.matchingBestTime = comparisonResult.bestValue.elapsedSeconds;
  } else if (activityType === "matching") {
    nextProfile.matchingSessions += 1;
  }

  return nextProfile;
}

function createMatchingLeaderboardPayload({
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
    score: toNonNegativeInteger(score, "score"),
    elapsedSeconds: toNonNegativeInteger(elapsedSeconds, "elapsedSeconds"),
    solvedPairs: toNonNegativeInteger(solvedPairs, "solvedPairs"),
  };
}

function createMatchingLeaderboardEntryRef(
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

function createMatchingLeaderboardWritePayload({
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

async function upsertMatchingLeaderboardPeriod({
  firestore,
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
  const scopeKey = createMatchingLeaderboardScopeKey({
    schoolId,
    grade,
    periodType,
    periodKey,
  });
  const payload = createMatchingLeaderboardPayload({
    schoolId,
    schoolName,
    grade,
    studentName,
    periodType,
    periodKey,
    score,
    elapsedSeconds,
    solvedPairs,
  });
  const studentKey = payload.studentNameNormalized;
  const leaderboardRef = doc(
    firestore,
    "matchingLeaderboards",
    scopeKey,
    "entries",
    studentKey,
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

    const existingScore = Number(snapshot.data().score ?? 0);

    if (payload.score > existingScore) {
      transaction.update(leaderboardRef, {
        score: payload.score,
        elapsedSeconds: payload.elapsedSeconds,
        solvedPairs: payload.solvedPairs,
        updatedAt: serverTimestamp(),
      });
      return "updated";
    }

    return "skipped";
  });
}

async function fetchMatchingLeaderboardPeriod({
  firestore,
  schoolId,
  grade,
  periodType,
  periodKey,
  limitCount,
}) {
  const cleanSchoolId = normalizeLeaderboardScope(schoolId);
  const cleanGrade = normalizeLeaderboardScope(grade);
  const scopeKey = createMatchingLeaderboardScopeKey({
    schoolId: cleanSchoolId,
    grade: cleanGrade,
    periodType,
    periodKey,
  });

  if (!cleanSchoolId || !cleanGrade || !periodKey || !scopeKey) {
    return {
      periodType,
      periodKey,
      entries: [],
    };
  }

  const leaderboardQuery = query(
    collection(firestore, "matchingLeaderboards", scopeKey, "entries"),
  );
  const snapshot = await getDocs(leaderboardQuery);
  const entries = snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data(),
    }))
    .sort((left, right) => {
      const scoreCompare = Number(right.score ?? 0) - Number(left.score ?? 0);
      if (scoreCompare !== 0) {
        return scoreCompare;
      }

      const elapsedCompare =
        Number(left.elapsedSeconds ?? 0) - Number(right.elapsedSeconds ?? 0);
      if (elapsedCompare !== 0) {
        return elapsedCompare;
      }

      const leftUpdatedAt = left.updatedAt?.toMillis?.() ?? 0;
      const rightUpdatedAt = right.updatedAt?.toMillis?.() ?? 0;
      return leftUpdatedAt - rightUpdatedAt;
    })
    .slice(0, limitCount)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

  return {
    periodType,
    periodKey,
    entries,
  };
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

export function normalizeSchoolName(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function createSchoolId(normalizedName) {
  return encodeURIComponent(normalizedName);
}

function normalizeUnitKey(unit) {
  return encodeURIComponent(String(unit ?? "").trim());
}

export function createVocabularySetId(ownerUid, grade, unit) {
  return `${ownerUid}__${grade}__${normalizeUnitKey(unit)}`;
}

export function getCurrentUser() {
  return auth?.currentUser ?? null;
}

export function subscribeToAuthChanges(callback) {
  if (!auth) {
    return () => {};
  }

  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle() {
  const { auth: firebaseAuth } = ensureFirebase();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  await signInWithPopup(firebaseAuth, provider);
}

export async function signOutCurrentUser() {
  const { auth: firebaseAuth } = ensureFirebase();
  await signOut(firebaseAuth);
}

export async function searchSchoolsByName(queryText) {
  const normalized = normalizeSchoolName(queryText);

  if (!normalized) {
    return [];
  }

  const schools = await listPublishedSchools();

  return schools
    .filter((school) => school.normalizedName.startsWith(normalized))
    .slice(0, 8)
    .map(({ id, name }) => ({ id, name }));
}

export async function listPopularSchools(limitCount = 5) {
  const schools = await listPublishedSchools();

  return schools.slice(0, limitCount).map(({ id, name }) => ({ id, name }));
}

async function listPublishedSchools() {
  const { db: firestore } = ensureFirebase();
  const snapshot = await getDocs(
    query(collection(firestore, "vocabularySets"), where("published", "==", true)),
  );

  const schoolUsage = new Map();

  snapshot.docs.forEach((item) => {
    const data = item.data();
    const schoolId = String(data.schoolId ?? "").trim();
    const schoolName = String(data.schoolName ?? "").trim();
    const normalizedName = normalizeSchoolName(schoolName);

    if (!schoolId || !schoolName || !normalizedName) {
      return;
    }

    const existing = schoolUsage.get(schoolId) ?? {
      id: schoolId,
      name: schoolName,
      normalizedName,
      setCount: 0,
    };

    schoolUsage.set(schoolId, {
      ...existing,
      name: existing.name || schoolName,
      normalizedName: existing.normalizedName || normalizedName,
      setCount: existing.setCount + 1,
    });
  });

  return Array.from(schoolUsage.values())
    .sort((left, right) => {
      const countCompare = right.setCount - left.setCount;
      if (countCompare !== 0) {
        return countCompare;
      }

      return String(left.name).localeCompare(String(right.name), undefined, {
        sensitivity: "base",
      });
    });
}

export async function findOrCreateSchool(name) {
  const { db: firestore } = ensureFirebase();
  const cleanName = String(name ?? "").trim().replace(/\s+/g, " ");
  const normalizedName = normalizeSchoolName(cleanName);

  if (!cleanName) {
    throw new Error("School name is required.");
  }

  const schoolRef = doc(firestore, "schools", createSchoolId(normalizedName));
  const existingSnapshot = await getDoc(schoolRef);

  if (existingSnapshot.exists()) {
    return {
      id: existingSnapshot.id,
      name: existingSnapshot.data().name,
    };
  }

  await setDoc(schoolRef, {
    name: cleanName,
    normalizedName,
    createdAt: serverTimestamp(),
  });

  return {
    id: schoolRef.id,
    name: cleanName,
  };
}

export async function getTeacherProfile(userId) {
  const { db: firestore } = ensureFirebase();
  const teacherRef = doc(firestore, "teachers", userId);
  const teacherSnapshot = await getDoc(teacherRef);

  if (!teacherSnapshot.exists()) {
    return null;
  }

  const data = teacherSnapshot.data();
  return {
    userId,
    teacherName: data.teacherName,
    schoolId: data.schoolId,
    schoolName: data.schoolName,
    gradePublishers: data.gradePublishers ?? {},
  };
}

export async function upsertTeacherProfile({
  userId,
  teacherName,
  schoolId,
  schoolName,
  gradePublishers = {},
}) {
  const { db: firestore } = ensureFirebase();
  const teacherRef = doc(firestore, "teachers", userId);

  const payload = {
    teacherName: teacherName.trim(),
    schoolId,
    schoolName: schoolName.trim(),
    isActive: true,
    gradePublishers,
    updatedAt: serverTimestamp(),
  };

  const teacherSnapshot = await getDoc(teacherRef);

  if (teacherSnapshot.exists()) {
    await updateDoc(teacherRef, payload);
    return;
  }

  await setDoc(teacherRef, {
    ...payload,
    createdAt: serverTimestamp(),
  });
}

export async function syncTeacherVocabularyMetadata({
  userId,
  schoolId,
  schoolName,
  teacherName,
}) {
  const { db: firestore } = ensureFirebase();
  const setsQuery = query(
    collection(firestore, "vocabularySets"),
    where("ownerUid", "==", userId),
  );
  const snapshot = await getDocs(setsQuery);

  await Promise.all(
    snapshot.docs.map((item) =>
      updateDoc(item.ref, {
        schoolId,
        schoolName: schoolName.trim(),
        teacherName: teacherName.trim(),
        updatedAt: serverTimestamp(),
      }),
    ),
  );
}

export async function deleteTeacherAccountData(userId) {
  const { db: firestore } = ensureFirebase();
  const cleanUserId = String(userId ?? "").trim();

  if (!cleanUserId) {
    throw new Error("Teacher user id is required.");
  }

  const setsQuery = query(
    collection(firestore, "vocabularySets"),
    where("ownerUid", "==", cleanUserId),
  );
  const snapshot = await getDocs(setsQuery);

  await Promise.all(snapshot.docs.map((item) => deleteDoc(item.ref)));
  await deleteDoc(doc(firestore, "teachers", cleanUserId));
}

export async function listTeacherSetCatalog(userId) {
  const { db: firestore } = ensureFirebase();
  const catalogQuery = query(
    collection(firestore, "vocabularySets"),
    where("ownerUid", "==", userId),
  );
  const snapshot = await getDocs(catalogQuery);

  return snapshot.docs
    .map((item) => item.data())
    .sort((left, right) => {
      const gradeCompare = String(left.grade).localeCompare(String(right.grade), undefined, {
        numeric: true,
        sensitivity: "base",
      });
      if (gradeCompare !== 0) {
        return gradeCompare;
      }
      return String(left.unit).localeCompare(String(right.unit), undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
}

export async function fetchTeacherVocabularySet(userId, selection) {
  const { db: firestore } = ensureFirebase();
  const grade = String(selection.grade ?? "").trim();
  const unit = String(selection.unit ?? "").trim();

  if (!grade || !unit) {
    return { items: [], published: false };
  }

  const setQuery = query(
    collection(firestore, "vocabularySets"),
    where("ownerUid", "==", userId),
    where("grade", "==", grade),
    where("unit", "==", unit),
    limit(1),
  );
  const snapshot = await getDocs(setQuery);

  if (snapshot.empty) {
    return { items: [], published: false, publisher: "" };
  }

  const data = snapshot.docs[0].data();
  return {
    items: data.items ?? [],
    published: Boolean(data.published),
    publisher: String(data.publisher ?? "").trim(),
  };
}

export async function saveTeacherVocabularySet({
  userId,
  schoolId,
  schoolName,
  teacherName,
  selection,
  items,
  published,
  publisher,
  sourceType = "manual",
}) {
  const { db: firestore } = ensureFirebase();
  const grade = String(selection.grade ?? "").trim();
  const unit = String(selection.unit ?? "").trim();

  if (!grade || !unit) {
    throw new Error("Grade and unit are required.");
  }

  const setRef = doc(firestore, "vocabularySets", createVocabularySetId(userId, grade, unit));
  const payload = {
    ownerUid: userId,
    schoolId,
    schoolName,
    teacherName,
    grade,
    unit,
    publisher: String(publisher ?? "").trim(),
    published: Boolean(published),
    sourceType,
    items,
    updatedAt: serverTimestamp(),
  };

  await setDoc(setRef, payload, { merge: true });
}

export async function deleteTeacherVocabularySet(userId, selection) {
  const { db: firestore } = ensureFirebase();
  const grade = String(selection.grade ?? "").trim();
  const unit = String(selection.unit ?? "").trim();

  if (!grade || !unit) {
    throw new Error("Grade and unit are required.");
  }

  const setRef = doc(firestore, "vocabularySets", createVocabularySetId(userId, grade, unit));
  await deleteDoc(setRef);
}

export async function deleteTeacherVocabularySetsForGrade(userId, grade) {
  const { db: firestore } = ensureFirebase();
  const cleanGrade = String(grade ?? "").trim();

  if (!cleanGrade) {
    throw new Error("Grade is required.");
  }

  const setsQuery = query(
    collection(firestore, "vocabularySets"),
    where("ownerUid", "==", userId),
    where("grade", "==", cleanGrade),
  );
  const snapshot = await getDocs(setsQuery);

  await Promise.all(snapshot.docs.map((item) => deleteDoc(item.ref)));
  return snapshot.docs.length;
}

export async function listTeachersForSchool(schoolId) {
  const { db: firestore } = ensureFirebase();
  const teachersQuery = query(
    collection(firestore, "teachers"),
    where("schoolId", "==", schoolId),
    where("isActive", "==", true),
  );
  const snapshot = await getDocs(teachersQuery);

  return snapshot.docs
    .map((item) => ({
      userId: item.id,
      teacherName: item.data().teacherName,
      isActive: true,
    }))
    .sort((left, right) => left.teacherName.localeCompare(right.teacherName));
}

export async function listPublishedUnitsForTeacher(userId, grade) {
  const { db: firestore } = ensureFirebase();
  const setsQuery = query(
    collection(firestore, "vocabularySets"),
    where("ownerUid", "==", userId),
    where("published", "==", true),
    where("grade", "==", String(grade)),
  );
  const snapshot = await getDocs(setsQuery);

  return snapshot.docs
    .map((item) => item.data())
    .map((entry) => entry.unit)
    .sort((left, right) =>
      String(left).localeCompare(String(right), undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
}

export async function searchPublishedPublisherSources({
  grade,
  publisher,
}) {
  const { db: firestore } = ensureFirebase();
  const setsQuery = query(
    collection(firestore, "vocabularySets"),
    where("published", "==", true),
    where("grade", "==", String(grade ?? "").trim()),
    where("publisher", "==", String(publisher ?? "").trim()),
  );
  const snapshot = await getDocs(setsQuery);

  return snapshot.docs.map((item) => item.data());
}

export async function fetchPublishedPublisherSourceUnits({
  ownerUid,
  grade,
  publisher,
}) {
  const { db: firestore } = ensureFirebase();
  const setsQuery = query(
    collection(firestore, "vocabularySets"),
    where("ownerUid", "==", String(ownerUid ?? "").trim()),
    where("published", "==", true),
    where("grade", "==", String(grade ?? "").trim()),
    where("publisher", "==", String(publisher ?? "").trim()),
  );
  const snapshot = await getDocs(setsQuery);

  return snapshot.docs
    .map((item) => item.data())
    .sort((left, right) =>
      String(left.unit ?? "").localeCompare(String(right.unit ?? ""), undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
}

export async function fetchPublishedVocabularySet({ teacherUserId, grade, unit }) {
  const { db: firestore } = ensureFirebase();
  const setRef = doc(
    firestore,
    "vocabularySets",
    createVocabularySetId(teacherUserId, grade, unit),
  );
  const snapshot = await getDoc(setRef);

  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.data();
  if (!data.published) {
    return [];
  }

  return data.items ?? [];
}

export async function fetchStudentProfile({ schoolId, grade, studentName }) {
  const { db: firestore } = ensureFirebase();
  const cleanSchoolId = normalizeLeaderboardScope(schoolId);
  const cleanGrade = normalizeStudentProgressGrade(grade);
  const cleanStudentName = normalizeStudentProfileName(studentName);

  if (!cleanSchoolId || !cleanGrade || !cleanStudentName) {
    return null;
  }

  const profileRef = createStudentProgressRef(firestore, {
    schoolId: cleanSchoolId,
    grade: cleanGrade,
    studentName: cleanStudentName,
  });
  const snapshot = await getDoc(profileRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...normalizeStudentProfileDocument(snapshot.data(), {
      schoolId: cleanSchoolId,
      grade: cleanGrade,
      studentName: cleanStudentName,
    }),
  };
}

export async function saveStudentProgress({
  schoolId,
  schoolName,
  grade,
  studentName,
  activityType,
  result,
}) {
  const { db: firestore } = ensureFirebase();
  const cleanSchoolId = normalizeLeaderboardScope(schoolId);
  const cleanSchoolName = normalizeStudentProgressSchoolName(schoolName);
  const cleanGrade = normalizeStudentProgressGrade(grade);
  const cleanStudentName = normalizeStudentProfileName(studentName);
  const cleanActivityType = normalizeStudentProgressActivityType(activityType);

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

  if (!isStudentProgressActivityType(cleanActivityType)) {
    throw new Error("Activity type must be listening, speaking, or matching.");
  }

  const profileRef = createStudentProgressRef(firestore, {
    schoolId: cleanSchoolId,
    grade: cleanGrade,
    studentName: cleanStudentName,
  });

  let comparisonResult = null;
  let newlyEarnedBadges = [];
  let nextProfile = null;

  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(profileRef);
    const currentProfile = normalizeStudentProfileDocument(
      snapshot.exists() ? snapshot.data() : null,
      {
        schoolId: cleanSchoolId,
        schoolName: cleanSchoolName,
        grade: cleanGrade,
        studentName: cleanStudentName,
      },
    );

    comparisonResult =
      cleanActivityType === "listening"
        ? compareListeningProgress(currentProfile, result)
        : cleanActivityType === "speaking"
          ? compareSpeakingProgress(currentProfile, result)
          : compareMatchingProgress(currentProfile, result);

    newlyEarnedBadges = evaluateEarnedBadges({
      profile: currentProfile,
      activityType: cleanActivityType,
      result,
      comparison: comparisonResult,
    });

    nextProfile = createNextStudentProfile({
      currentProfile,
      schoolId: cleanSchoolId,
      schoolName: cleanSchoolName,
      grade: cleanGrade,
      studentName: cleanStudentName,
      activityType: cleanActivityType,
      comparisonResult,
      newlyEarnedBadges,
    });

    if (snapshot.exists()) {
      transaction.update(profileRef, nextProfile);
      return;
    }

    transaction.set(profileRef, nextProfile);
  });

  const committedSnapshot = await getDoc(profileRef);
  const profile = committedSnapshot.exists()
    ? {
        id: committedSnapshot.id,
        ...normalizeStudentProfileDocument(committedSnapshot.data(), nextProfile),
      }
    : null;

  return {
    profile,
    comparison: buildProgressSummary({
      activityType: cleanActivityType,
      comparisonResult,
    }),
    newlyEarnedBadges,
  };
}

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
        score,
        elapsedSeconds,
        solvedPairs,
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
