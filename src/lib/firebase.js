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
  Timestamp,
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
import { normalizeActivityLeaderboardType } from "../utils/activityLeaderboard.js";
import { BADGE_IDS } from "../constants/badges.js";
import {
  buildProgressSummary,
  compareListeningProgress,
  compareMatchingProgress,
  compareSpeakingProgress,
  compareTypingProgress,
  createStudentProfileId,
  evaluateEarnedBadges,
  normalizeStudentProfileName,
} from "../utils/studentProgress.js";
import {
  canMarkBingoCell,
  computeBingoLines,
  createBingoBoard,
  createBingoSetupBoard,
  createBingoSessionCode,
  createBingoWordId,
  determineBingoBoardSize,
  finalizeBingoBoardPlacements,
  createEmptyBingoBoardCells,
  normalizeBingoItems,
  normalizeBingoText,
  selectNextBingoWord,
} from "../utils/bingo.js";

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

function toNonNegativeNumber(value, fieldName) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }

  return Math.max(0, numberValue);
}

const STUDENT_PROGRESS_ACTIVITY_TYPES = new Set([
  "listening",
  "speaking",
  "matching",
  "typing",
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
    typingSessions: toNonNegativeInteger(snapshotData?.typingSessions ?? 0),
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
    typingBestScore: toNonNegativeInteger(snapshotData?.typingBestScore ?? 0),
    typingBestCorrectCount: toNonNegativeInteger(
      snapshotData?.typingBestCorrectCount ?? 0,
    ),
    typingBestAccuracy: toNonNegativeNumber(snapshotData?.typingBestAccuracy ?? 0, "typingBestAccuracy"),
    typingBestQuestionCount: toNonNegativeInteger(snapshotData?.typingBestQuestionCount ?? 0),
    typingBestHintUsedCount: toNonNegativeInteger(snapshotData?.typingBestHintUsedCount ?? 0),
    typingBestCombo: toNonNegativeInteger(snapshotData?.typingBestCombo ?? 0),
    typingBestElapsedSeconds: toNonNegativeInteger(
      snapshotData?.typingBestElapsedSeconds ?? 0,
    ),
    typingLastPlayedAt:
      snapshotData?.typingLastPlayedAt ?? cleanFallback.typingLastPlayedAt ?? null,
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
    typingSessions: currentProfile.typingSessions,
    listeningBestScore: currentProfile.listeningBestScore,
    listeningBestCorrectCount: currentProfile.listeningBestCorrectCount,
    speakingBestScore: currentProfile.speakingBestScore,
    speakingBestCorrectCount: currentProfile.speakingBestCorrectCount,
    matchingBestScore: currentProfile.matchingBestScore,
    matchingBestTime: currentProfile.matchingBestTime,
    typingBestScore: currentProfile.typingBestScore,
    typingBestCorrectCount: currentProfile.typingBestCorrectCount,
    typingBestAccuracy: currentProfile.typingBestAccuracy,
    typingBestQuestionCount: currentProfile.typingBestQuestionCount,
    typingBestHintUsedCount: currentProfile.typingBestHintUsedCount,
    typingBestCombo: currentProfile.typingBestCombo,
    typingBestElapsedSeconds: currentProfile.typingBestElapsedSeconds,
    typingLastPlayedAt: currentProfile.typingLastPlayedAt ?? null,
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

  if (activityType === "typing" && comparisonResult.isNewBest) {
    nextProfile.typingSessions += 1;
    nextProfile.typingBestScore = comparisonResult.bestValue.score;
    nextProfile.typingBestCorrectCount = comparisonResult.bestValue.correctCount;
    nextProfile.typingBestAccuracy = comparisonResult.bestValue.accuracy;
    nextProfile.typingBestQuestionCount = comparisonResult.bestValue.questionCount;
    nextProfile.typingBestHintUsedCount = comparisonResult.bestValue.hintUsedCount;
    nextProfile.typingBestCombo = comparisonResult.bestValue.bestCombo;
    nextProfile.typingBestElapsedSeconds = comparisonResult.bestValue.elapsedSeconds;
    nextProfile.typingLastPlayedAt = serverTimestamp();
  } else if (activityType === "typing") {
    nextProfile.typingSessions += 1;
    nextProfile.typingLastPlayedAt = serverTimestamp();
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

function createFishingLeaderboardPayload({
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
    correctCount: toNonNegativeInteger(correctCount, "correctCount"),
    wrongCount: toNonNegativeInteger(wrongCount, "wrongCount"),
    missCount: toNonNegativeInteger(missCount, "missCount"),
  };
}

function createTypingLeaderboardPayload({
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
    questionCount: toNonNegativeInteger(questionCount, "questionCount"),
    correctCount: toNonNegativeInteger(correctCount, "correctCount"),
    accuracy: toNonNegativeNumber(accuracy, "accuracy"),
    hintUsedCount: toNonNegativeInteger(hintUsedCount, "hintUsedCount"),
    bestCombo: toNonNegativeInteger(bestCombo, "bestCombo"),
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

function createFishingLeaderboardEntryRef(
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

function createTypingLeaderboardEntryRef(
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

function createFishingLeaderboardWritePayload({
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

function createTypingLeaderboardWritePayload({
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

  const leftUpdatedAt = left.updatedAt?.toMillis?.() ?? left.createdAt?.toMillis?.() ?? 0;
  const rightUpdatedAt = right.updatedAt?.toMillis?.() ?? right.createdAt?.toMillis?.() ?? 0;

  if (leftUpdatedAt !== rightUpdatedAt) {
    return rightUpdatedAt > leftUpdatedAt ? right : left;
  }

  return left;
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

async function upsertFishingLeaderboardPeriod({
  firestore,
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
  const scopeKey = createMatchingLeaderboardScopeKey({
    schoolId,
    grade,
    periodType,
    periodKey,
  });
  const payload = createFishingLeaderboardPayload({
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
  });
  const studentKey = payload.studentNameNormalized;
  const leaderboardRef = doc(
    firestore,
    "fishingLeaderboards",
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
        correctCount: payload.correctCount,
        wrongCount: payload.wrongCount,
        missCount: payload.missCount,
        updatedAt: serverTimestamp(),
      });
      return "updated";
    }

    return "skipped";
  });
}

async function upsertTypingLeaderboardPeriod({
  firestore,
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
  const scopeKey = createMatchingLeaderboardScopeKey({
    schoolId,
    grade,
    periodType,
    periodKey,
  });
  const payload = createTypingLeaderboardPayload({
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
  });
  const studentKey = payload.studentNameNormalized;
  const leaderboardRef = doc(
    firestore,
    "typingLeaderboards",
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

    const nextData = {
      ...snapshot.data(),
      ...payload,
    };
    const winner = pickBetterTypingLeaderboardEntry(snapshot.data(), nextData);

    if (winner === nextData) {
      transaction.update(leaderboardRef, {
        score: payload.score,
        elapsedSeconds: payload.elapsedSeconds,
        questionCount: payload.questionCount,
        correctCount: payload.correctCount,
        accuracy: payload.accuracy,
        hintUsedCount: payload.hintUsedCount,
        bestCombo: payload.bestCombo,
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

async function fetchFishingLeaderboardPeriod({
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
    collection(firestore, "fishingLeaderboards", scopeKey, "entries"),
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

async function fetchTypingLeaderboardPeriod({
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
    collection(firestore, "typingLeaderboards", scopeKey, "entries"),
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

      const accuracyCompare = Number(right.accuracy ?? 0) - Number(left.accuracy ?? 0);
      if (accuracyCompare !== 0) {
        return accuracyCompare;
      }

      const elapsedCompare =
        Number(left.elapsedSeconds ?? 0) - Number(right.elapsedSeconds ?? 0);
      if (elapsedCompare !== 0) {
        return elapsedCompare;
      }

      const comboCompare = Number(right.bestCombo ?? 0) - Number(left.bestCombo ?? 0);
      if (comboCompare !== 0) {
        return comboCompare;
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
    throw new Error("Activity type must be listening, speaking, matching, or typing.");
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
          : cleanActivityType === "typing"
            ? compareTypingProgress(currentProfile, result)
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
        score,
        elapsedSeconds,
        correctCount,
        wrongCount,
        missCount,
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
        score,
        elapsedSeconds,
        questionCount,
        correctCount,
        accuracy,
        hintUsedCount,
        bestCombo,
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

function createBingoSessionRef(firestore, sessionId) {
  return doc(firestore, "bingoSessions", String(sessionId ?? "").trim());
}

function createBingoPlayerRef(firestore, sessionId, playerId) {
  return doc(
    firestore,
    "bingoSessions",
    String(sessionId ?? "").trim(),
    "players",
    String(playerId ?? "").trim(),
  );
}

function normalizeBingoSessionItems(items) {
  return normalizeBingoItems(items).map((item) => ({
    id: item.id,
    word: item.word,
    meaning: item.meaning,
    imageHint: item.imageHint,
    exampleSentence: item.exampleSentence,
  }));
}

function normalizeBingoPlayerName(studentName) {
  return normalizeBingoText(studentName);
}

function normalizeBingoSelectionList(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => normalizeBingoText(value))
        .filter(Boolean),
    ),
  );
}

function createBingoPlayerId(studentName) {
  return normalizeBingoPlayerName(studentName)
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/gi, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeBingoBoardCells(boardCells) {
  return (Array.isArray(boardCells) ? boardCells : []).map((cell, index) => ({
    index: Number.isFinite(Number(cell?.index)) ? Number(cell.index) : index,
    row: Number.isFinite(Number(cell?.row)) ? Number(cell.row) : 0,
    column: Number.isFinite(Number(cell?.column)) ? Number(cell.column) : 0,
    wordId: String(cell?.wordId ?? "").trim(),
    word: String(cell?.word ?? "").trim(),
    meaning: String(cell?.meaning ?? "").trim(),
    imageHint: String(cell?.imageHint ?? "").trim(),
    exampleSentence: String(cell?.exampleSentence ?? "").trim(),
  }));
}

function normalizeBingoSessionDocument(snapshotData, fallback = {}) {
  const cleanFallback = fallback ?? {};
  const sessionCode = String(snapshotData?.sessionCode ?? cleanFallback.sessionCode ?? "").trim();
  const boardSize = Number(snapshotData?.boardSize ?? cleanFallback.boardSize ?? 0);
  const requiredCellCount = Number(
    snapshotData?.requiredCellCount
      ?? cleanFallback.requiredCellCount
      ?? (Number.isFinite(boardSize) && boardSize > 0 ? boardSize * boardSize : 0),
  );
  const fallbackUnit = String(cleanFallback.unit ?? "").trim();
  const selectedUnits = normalizeBingoSelectionList(
    snapshotData?.selectedUnits
      ?? cleanFallback.selectedUnits
      ?? (fallbackUnit ? [fallbackUnit] : []),
  );
  const selectedUnitLabels = normalizeBingoSelectionList(
    snapshotData?.selectedUnitLabels
      ?? cleanFallback.selectedUnitLabels
      ?? (fallbackUnit ? [fallbackUnit] : []),
  );

  return {
    sessionCode,
    teacherUserId: String(snapshotData?.teacherUserId ?? cleanFallback.teacherUserId ?? "").trim(),
    teacherName: String(snapshotData?.teacherName ?? cleanFallback.teacherName ?? "").trim(),
    schoolId: String(snapshotData?.schoolId ?? cleanFallback.schoolId ?? "").trim(),
    schoolName: String(snapshotData?.schoolName ?? cleanFallback.schoolName ?? "").trim(),
    grade: String(snapshotData?.grade ?? cleanFallback.grade ?? "").trim(),
    unit: String(snapshotData?.unit ?? cleanFallback.unit ?? "").trim(),
    publisher: String(snapshotData?.publisher ?? cleanFallback.publisher ?? "").trim(),
    selectedUnits,
    selectedUnitLabels,
    requiredCellCount: Number.isFinite(requiredCellCount) ? requiredCellCount : 0,
    mode: String(snapshotData?.mode ?? cleanFallback.mode ?? "manual").trim(),
    boardSize: Number.isFinite(boardSize) ? boardSize : 0,
    status: String(snapshotData?.status ?? cleanFallback.status ?? "waiting").trim(),
    activeWordId: String(snapshotData?.activeWordId ?? cleanFallback.activeWordId ?? "").trim(),
    activeWordText: String(snapshotData?.activeWordText ?? cleanFallback.activeWordText ?? "").trim(),
    activeWordMeaning: String(snapshotData?.activeWordMeaning ?? cleanFallback.activeWordMeaning ?? "").trim(),
    callSequence: Array.isArray(snapshotData?.callSequence)
      ? snapshotData.callSequence
      : Array.isArray(cleanFallback.callSequence)
        ? cleanFallback.callSequence
        : [],
    calledWordIds: Array.isArray(snapshotData?.calledWordIds)
      ? snapshotData.calledWordIds.map((value) => String(value ?? "").trim()).filter(Boolean)
      : Array.isArray(cleanFallback.calledWordIds)
        ? cleanFallback.calledWordIds.map((value) => String(value ?? "").trim()).filter(Boolean)
        : [],
    vocabularyItems: normalizeBingoSessionItems(
      snapshotData?.vocabularyItems ?? cleanFallback.vocabularyItems ?? [],
    ),
    createdAt: snapshotData?.createdAt ?? cleanFallback.createdAt ?? null,
    updatedAt: snapshotData?.updatedAt ?? cleanFallback.updatedAt ?? null,
    finishedAt: snapshotData?.finishedAt ?? cleanFallback.finishedAt ?? null,
    finishedBy: String(snapshotData?.finishedBy ?? cleanFallback.finishedBy ?? "").trim(),
  };
}

function normalizeBingoPlayerDocument(snapshotData, fallback = {}) {
  const cleanFallback = fallback ?? {};
  const studentName = normalizeBingoPlayerName(
    snapshotData?.studentName ?? cleanFallback.studentName,
  );
  const boardCells = normalizeBingoBoardCells(
    snapshotData?.boardCells ?? cleanFallback.boardCells ?? [],
  );
  const boardSize = Number(snapshotData?.boardSize ?? cleanFallback.boardSize ?? 0);
  const setupStatus = String(snapshotData?.setupStatus ?? cleanFallback.setupStatus ?? "ready").trim();
  const requiredCellCount = Number(
    snapshotData?.requiredCellCount
      ?? cleanFallback.requiredCellCount
      ?? (Number.isFinite(boardSize) && boardSize > 0 ? boardSize * boardSize : 0),
  );
  const markedWordIds = Array.isArray(snapshotData?.markedWordIds)
    ? snapshotData.markedWordIds.map((value) => String(value ?? "").trim()).filter(Boolean)
    : Array.isArray(cleanFallback.markedWordIds)
      ? cleanFallback.markedWordIds.map((value) => String(value ?? "").trim()).filter(Boolean)
      : [];
  const availableWords = normalizeBingoSessionItems(
    snapshotData?.availableWords
      ?? cleanFallback.availableWords
      ?? boardCells.map((cell) => ({
        id: cell.wordId,
        word: cell.word,
        meaning: cell.meaning,
        imageHint: cell.imageHint,
        exampleSentence: cell.exampleSentence,
      })),
  );
  const setupStartedAt = snapshotData?.setupStartedAt
    ?? cleanFallback.setupStartedAt
    ?? snapshotData?.joinedAt
    ?? cleanFallback.joinedAt
    ?? snapshotData?.updatedAt
    ?? cleanFallback.updatedAt
    ?? null;
  const setupCompletedAt = snapshotData?.setupCompletedAt
    ?? cleanFallback.setupCompletedAt
    ?? snapshotData?.updatedAt
    ?? cleanFallback.updatedAt
    ?? snapshotData?.joinedAt
    ?? cleanFallback.joinedAt
    ?? null;
  const bingoLinesResult = computeBingoLines(markedWordIds, boardCells, boardSize);

  return {
    studentName,
    studentNameNormalized: createBingoPlayerId(studentName),
    boardSize: Number.isFinite(boardSize) ? boardSize : 0,
    setupStatus,
    requiredCellCount: Number.isFinite(requiredCellCount) ? requiredCellCount : 0,
    availableWords,
    boardCells,
    boardWordIds: Array.isArray(snapshotData?.boardWordIds)
      ? snapshotData.boardWordIds.map((value) => String(value ?? "").trim()).filter(Boolean)
      : boardCells.map((cell) => cell.wordId).filter(Boolean),
    markedWordIds,
    bingoLines: bingoLinesResult.bingoLines,
    completedLineKeys: bingoLinesResult.completedLineKeys,
    hasBingo: Boolean(snapshotData?.hasBingo ?? cleanFallback.hasBingo ?? bingoLinesResult.bingoLines > 0),
    bingoRank: Number.isFinite(Number(snapshotData?.bingoRank))
      ? Number(snapshotData.bingoRank)
      : Number.isFinite(Number(cleanFallback.bingoRank))
        ? Number(cleanFallback.bingoRank)
        : null,
    setupStartedAt,
    setupCompletedAt,
    joinedAt: snapshotData?.joinedAt ?? cleanFallback.joinedAt ?? null,
    updatedAt: snapshotData?.updatedAt ?? cleanFallback.updatedAt ?? null,
  };
}

function createBingoSessionPayload({
  teacherUserId,
  teacherName,
  schoolId,
  schoolName,
  grade,
  unit,
  publisher,
  selectedUnits,
  selectedUnitLabels,
  mode,
  items,
  boardSize,
  sessionCode,
}) {
  const normalizedItems = normalizeBingoSessionItems(items);
  const safeBoardSize = boardSize ?? determineBingoBoardSize(normalizedItems.length);
  const board = createBingoBoard(normalizedItems, safeBoardSize);
  const cleanSelectedUnits = normalizeBingoSelectionList(
    selectedUnits ?? [unit],
  );
  const cleanSelectedUnitLabels = normalizeBingoSelectionList(
    selectedUnitLabels ?? [unit],
  );
  const cleanMode = normalizeBingoText(mode).toLowerCase() || "manual";
  const cleanTeacherUserId = normalizeBingoText(teacherUserId);
  const cleanTeacherName = normalizeBingoText(teacherName);

  return {
    sessionCode,
    teacherUserId: cleanTeacherUserId,
    teacherName: cleanTeacherName,
    schoolId: normalizeBingoText(schoolId),
    schoolName: normalizeBingoText(schoolName),
    grade: normalizeBingoText(grade),
    unit: normalizeBingoText(cleanSelectedUnitLabels[0] ?? unit),
    publisher: normalizeBingoText(publisher),
    selectedUnits: cleanSelectedUnits,
    selectedUnitLabels: cleanSelectedUnitLabels,
    requiredCellCount: board.boardSize * board.boardSize,
    mode: cleanMode === "tts" ? "tts" : "manual",
    boardSize: board.boardSize,
    status: "live",
    activeWordId: "",
    activeWordText: "",
    activeWordMeaning: "",
    callSequence: [],
    calledWordIds: [],
    vocabularyItems: normalizedItems,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    finishedAt: null,
    finishedBy: "",
  };
}

export async function createBingoSession({
  teacherUserId,
  teacherName,
  schoolId,
  schoolName,
  grade,
  unit,
  publisher,
  selectedUnits = [],
  selectedUnitLabels = [],
  mode = "manual",
  items,
  boardSize,
  sessionCode = createBingoSessionCode(),
}) {
  const { db: firestore } = ensureFirebase();
  const cleanSessionCode = String(sessionCode ?? "").trim().toUpperCase();
  const cleanTeacherUserId = String(teacherUserId ?? "").trim();
  const cleanTeacherName = String(teacherName ?? "").trim();
  const cleanSchoolId = String(schoolId ?? "").trim();
  const cleanSchoolName = String(schoolName ?? "").trim();
  const cleanGrade = String(grade ?? "").trim();
  const cleanUnit = String(unit ?? "").trim();
  const cleanPublisher = String(publisher ?? "").trim();
  const cleanSelectedUnits = normalizeBingoSelectionList(
    selectedUnits.length ? selectedUnits : [cleanUnit],
  );
  const cleanSelectedUnitLabels = normalizeBingoSelectionList(
    selectedUnitLabels.length ? selectedUnitLabels : [cleanUnit],
  );
  const normalizedItems = normalizeBingoSessionItems(items);

  if (!cleanSessionCode) {
    throw new Error("Bingo session code is required.");
  }

  if (!cleanTeacherUserId) {
    throw new Error("Teacher user id is required.");
  }

  if (!cleanTeacherName) {
    throw new Error("Teacher name is required.");
  }

  if (!cleanSchoolId) {
    throw new Error("School id is required.");
  }

  if (!cleanSchoolName) {
    throw new Error("School name is required.");
  }

  if (!cleanGrade) {
    throw new Error("Grade is required.");
  }

  if (!cleanUnit) {
    throw new Error("Unit is required.");
  }

  if (normalizedItems.length < 9) {
    throw new Error("Bingo requires at least 9 unique words.");
  }

  const sessionRef = createBingoSessionRef(firestore, cleanSessionCode);
  const existingSession = await getDoc(sessionRef);

  if (existingSession.exists()) {
    throw new Error("이미 사용 중인 빙고 참여 코드입니다.");
  }

  const payload = createBingoSessionPayload({
    teacherUserId: cleanTeacherUserId,
    teacherName: cleanTeacherName,
    schoolId: cleanSchoolId,
    schoolName: cleanSchoolName,
    grade: cleanGrade,
    unit: cleanUnit,
    publisher: cleanPublisher,
    selectedUnits: cleanSelectedUnits,
    selectedUnitLabels: cleanSelectedUnitLabels,
    mode,
    items: normalizedItems,
    boardSize,
    sessionCode: cleanSessionCode,
  });

  await setDoc(sessionRef, payload);

  return {
    sessionId: cleanSessionCode,
    sessionCode: cleanSessionCode,
    session: {
      id: cleanSessionCode,
      ...normalizeBingoSessionDocument(payload),
    },
  };
}

export async function joinBingoSession({ sessionCode, studentName }) {
  const { db: firestore } = ensureFirebase();
  const cleanSessionCode = String(sessionCode ?? "").trim().toUpperCase();
  const cleanStudentName = normalizeBingoPlayerName(studentName);
  const playerId = createBingoPlayerId(cleanStudentName);

  if (!cleanSessionCode) {
    throw new Error("Bingo session code is required.");
  }

  if (!cleanStudentName) {
    throw new Error("Student name is required.");
  }

  if (!playerId) {
    throw new Error("Student name must contain letters or numbers.");
  }

  const sessionRef = createBingoSessionRef(firestore, cleanSessionCode);
  const playerRef = createBingoPlayerRef(firestore, cleanSessionCode, playerId);

  return runTransaction(firestore, async (transaction) => {
    const sessionSnapshot = await transaction.get(sessionRef);

    if (!sessionSnapshot.exists()) {
      throw new Error("빙고 참여 코드를 찾을 수 없습니다.");
    }

    const sessionData = normalizeBingoSessionDocument(sessionSnapshot.data(), {
      sessionCode: cleanSessionCode,
    });

    if (sessionData.status === "finished") {
      throw new Error("이미 종료된 빙고 세션입니다.");
    }

    const playerSnapshot = await transaction.get(playerRef);

    if (playerSnapshot.exists()) {
      throw new Error("같은 이름의 학생이 이미 참여했습니다.");
    }

    const setupBoard = createBingoSetupBoard(
      sessionData.vocabularyItems,
      sessionData.boardSize,
    );
    const playerPayload = {
      studentName: cleanStudentName,
      studentNameNormalized: playerId,
      boardSize: setupBoard.boardSize,
      requiredCellCount: setupBoard.requiredCellCount,
      setupStatus: "arranging",
      availableWords: setupBoard.availableWords,
      boardCells: setupBoard.boardCells,
      boardWordIds: setupBoard.boardWordIds,
      markedWordIds: [],
      bingoLines: 0,
      completedLineKeys: [],
      hasBingo: false,
      bingoRank: null,
      setupStartedAt: serverTimestamp(),
      setupCompletedAt: null,
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    transaction.set(playerRef, playerPayload);

    return {
      sessionId: cleanSessionCode,
      sessionCode: cleanSessionCode,
      playerId,
      session: {
        id: sessionSnapshot.id,
        ...sessionData,
      },
      player: {
        id: playerId,
        playerId,
        ...normalizeBingoPlayerDocument(playerPayload, {
          studentName: cleanStudentName,
          boardSize: setupBoard.boardSize,
          requiredCellCount: setupBoard.requiredCellCount,
          setupStatus: "arranging",
          boardCells: setupBoard.boardCells,
          availableWords: setupBoard.availableWords,
        }),
      },
    };
  });
}

function normalizeBingoBoardSetupDraft(boardCells, boardSize, availableWords = []) {
  const safeBoardSize = Number(boardSize);
  const requiredCellCount = safeBoardSize * safeBoardSize;
  const normalizedCells = createEmptyBingoBoardCells(safeBoardSize);
  const seenWordIds = new Set();
  const availableWordMap = new Map(
    normalizeBingoSessionItems(availableWords).map((item) => [item.id, item]),
  );
  const incomingCells = Array.isArray(boardCells) ? boardCells : [];

  incomingCells.forEach((cell, index) => {
    const cellIndex = Number.isFinite(Number(cell?.index))
      ? Number(cell.index)
      : index;

    if (cellIndex < 0 || cellIndex >= requiredCellCount) {
      return;
    }

    const wordId = normalizeBingoText(cell?.wordId);
    const word = normalizeBingoText(cell?.word);
    const meaning = normalizeBingoText(cell?.meaning);
    const imageHint = normalizeBingoText(cell?.imageHint);
    const exampleSentence = normalizeBingoText(cell?.exampleSentence);

    if (!wordId) {
      return;
    }

    if (seenWordIds.has(wordId)) {
      throw new Error("같은 단어는 한 번만 배치할 수 있습니다.");
    }

    seenWordIds.add(wordId);
    const selectedItem = availableWordMap.get(wordId) ?? {
      id: wordId,
      word,
      meaning,
      imageHint,
      exampleSentence,
    };
    normalizedCells[cellIndex] = {
      index: cellIndex,
      row: Math.floor(cellIndex / safeBoardSize),
      column: cellIndex % safeBoardSize,
      wordId: selectedItem.id,
      word: normalizeBingoText(selectedItem.word) || word,
      meaning: normalizeBingoText(selectedItem.meaning) || meaning,
      imageHint: normalizeBingoText(selectedItem.imageHint) || imageHint,
      exampleSentence:
        normalizeBingoText(selectedItem.exampleSentence) || exampleSentence,
    };
  });

  return normalizedCells;
}

export async function saveBingoBoardSetupDraft({
  sessionId,
  playerId,
  boardCells,
}) {
  const { db: firestore } = ensureFirebase();
  const cleanSessionId = String(sessionId ?? "").trim().toUpperCase();
  const cleanPlayerId = String(playerId ?? "").trim();
  const sessionRef = createBingoSessionRef(firestore, cleanSessionId);
  const playerRef = createBingoPlayerRef(firestore, cleanSessionId, cleanPlayerId);

  return runTransaction(firestore, async (transaction) => {
    const [sessionSnapshot, playerSnapshot] = await Promise.all([
      transaction.get(sessionRef),
      transaction.get(playerRef),
    ]);

    if (!sessionSnapshot.exists()) {
      throw new Error("빙고 세션을 찾을 수 없습니다.");
    }

    if (!playerSnapshot.exists()) {
      throw new Error("빙고 참가자를 찾을 수 없습니다.");
    }

    const sessionData = normalizeBingoSessionDocument(sessionSnapshot.data(), {
      sessionCode: cleanSessionId,
    });
    const playerData = normalizeBingoPlayerDocument(playerSnapshot.data(), {
      studentName: playerSnapshot.data()?.studentName,
      boardSize: playerSnapshot.data()?.boardSize,
      setupStatus: playerSnapshot.data()?.setupStatus,
      requiredCellCount: playerSnapshot.data()?.requiredCellCount,
      availableWords: playerSnapshot.data()?.availableWords,
      boardCells: playerSnapshot.data()?.boardCells,
      boardWordIds: playerSnapshot.data()?.boardWordIds,
      markedWordIds: playerSnapshot.data()?.markedWordIds,
      bingoRank: playerSnapshot.data()?.bingoRank,
      hasBingo: playerSnapshot.data()?.hasBingo,
    });

    if (sessionData.status !== "live") {
      throw new Error("이미 종료된 빙고 세션입니다.");
    }

    if (playerData.setupStatus !== "arranging") {
      throw new Error("이미 빙고판 배치가 완료되었습니다.");
    }

    const availableWordMap = new Map(
      playerData.availableWords.map((item) => [item.id, item]),
    );
    const draftCells = normalizeBingoBoardSetupDraft(
      boardCells ?? playerData.boardCells,
      playerData.boardSize,
      playerData.availableWords,
    );
    const draftWordIds = draftCells
      .map((cell) => normalizeBingoText(cell.wordId))
      .filter(Boolean);

    draftWordIds.forEach((wordId) => {
      if (!availableWordMap.has(wordId)) {
        throw new Error("빙고판에 없는 단어는 배치할 수 없습니다.");
      }
    });

    transaction.update(playerRef, {
      boardCells: draftCells,
      boardWordIds: draftWordIds,
      updatedAt: serverTimestamp(),
    });

    return {
      sessionId: cleanSessionId,
      playerId: cleanPlayerId,
      boardCells: draftCells,
      boardWordIds: draftWordIds,
      player: {
        id: playerSnapshot.id,
        ...playerData,
        boardCells: draftCells,
        boardWordIds: draftWordIds,
      },
    };
  });
}

export async function finalizeBingoBoardSetup({
  sessionId,
  playerId,
  boardCells,
  autoFillRemaining = false,
  random = Math.random,
}) {
  const { db: firestore } = ensureFirebase();
  const cleanSessionId = String(sessionId ?? "").trim().toUpperCase();
  const cleanPlayerId = String(playerId ?? "").trim();
  const sessionRef = createBingoSessionRef(firestore, cleanSessionId);
  const playerRef = createBingoPlayerRef(firestore, cleanSessionId, cleanPlayerId);

  return runTransaction(firestore, async (transaction) => {
    const [sessionSnapshot, playerSnapshot] = await Promise.all([
      transaction.get(sessionRef),
      transaction.get(playerRef),
    ]);

    if (!sessionSnapshot.exists()) {
      throw new Error("빙고 세션을 찾을 수 없습니다.");
    }

    if (!playerSnapshot.exists()) {
      throw new Error("빙고 참가자를 찾을 수 없습니다.");
    }

    const sessionData = normalizeBingoSessionDocument(sessionSnapshot.data(), {
      sessionCode: cleanSessionId,
    });
    const playerData = normalizeBingoPlayerDocument(playerSnapshot.data(), {
      studentName: playerSnapshot.data()?.studentName,
      boardSize: playerSnapshot.data()?.boardSize,
      setupStatus: playerSnapshot.data()?.setupStatus,
      requiredCellCount: playerSnapshot.data()?.requiredCellCount,
      availableWords: playerSnapshot.data()?.availableWords,
      boardCells: playerSnapshot.data()?.boardCells,
      boardWordIds: playerSnapshot.data()?.boardWordIds,
      markedWordIds: playerSnapshot.data()?.markedWordIds,
      bingoRank: playerSnapshot.data()?.bingoRank,
      hasBingo: playerSnapshot.data()?.hasBingo,
    });

    if (sessionData.status !== "live") {
      throw new Error("이미 종료된 빙고 세션입니다.");
    }

    if (playerData.setupStatus !== "arranging") {
      throw new Error("이미 빙고판 배치가 완료되었습니다.");
    }

    const finalizedBoard = finalizeBingoBoardPlacements({
      boardCells: boardCells ?? playerData.boardCells,
      availableWords: playerData.availableWords,
      boardSize: playerData.boardSize,
      autoFillRemaining,
      random,
    });

    transaction.update(playerRef, {
      setupStatus: "ready",
      boardCells: finalizedBoard.boardCells,
      boardWordIds: finalizedBoard.boardWordIds,
      requiredCellCount: finalizedBoard.requiredCellCount,
      setupCompletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      sessionId: cleanSessionId,
      playerId: cleanPlayerId,
      boardCells: finalizedBoard.boardCells,
      boardWordIds: finalizedBoard.boardWordIds,
      player: {
        id: playerSnapshot.id,
        ...playerData,
        setupStatus: "ready",
        boardCells: finalizedBoard.boardCells,
        boardWordIds: finalizedBoard.boardWordIds,
        requiredCellCount: finalizedBoard.requiredCellCount,
      },
    };
  });
}

export async function callBingoWord({
  sessionId,
  wordId,
  teacherUserId,
  mode,
  word,
  meaning,
  random = Math.random,
}) {
  const { db: firestore } = ensureFirebase();
  const cleanSessionId = String(sessionId ?? "").trim().toUpperCase();
  const sessionRef = createBingoSessionRef(firestore, cleanSessionId);
  const cleanWordId = String(wordId ?? "").trim();
  const cleanWord = normalizeBingoText(word);
  const cleanMeaning = normalizeBingoText(meaning);
  const cleanTeacherUserId = normalizeBingoText(teacherUserId);
  const cleanMode = normalizeBingoText(mode).toLowerCase();

  return runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(sessionRef);

    if (!snapshot.exists()) {
      throw new Error("빙고 세션을 찾을 수 없습니다.");
    }

    const currentSession = normalizeBingoSessionDocument(snapshot.data(), {
      sessionCode: cleanSessionId,
    });

    if (
      cleanTeacherUserId
      && currentSession.teacherUserId
      && currentSession.teacherUserId !== cleanTeacherUserId
    ) {
      throw new Error("이 빙고 세션의 교사가 아닙니다.");
    }

    const selectedItem = (() => {
      if (cleanWordId || cleanWord) {
        const matchedItem = currentSession.vocabularyItems.find((item) => {
          const itemId = normalizeBingoText(item.id);
          const itemWord = normalizeBingoText(item.word);
          return (
            (cleanWordId && itemId === cleanWordId)
            || (cleanWord && itemWord === cleanWord)
          );
        });

        if (!matchedItem) {
          throw new Error("세션 단어 목록에 없는 단어입니다.");
        }

        return matchedItem;
      }

      return selectNextBingoWord(
        currentSession.vocabularyItems,
        currentSession.calledWordIds,
        random,
      );
    })();

    if (!selectedItem) {
      throw new Error("호출할 단어가 더 이상 없습니다.");
    }

    const normalizedSelectedItem = {
      id: createBingoWordId(selectedItem),
      word: normalizeBingoText(selectedItem.word),
      meaning: normalizeBingoText(selectedItem.meaning),
      imageHint: normalizeBingoText(selectedItem.imageHint),
      exampleSentence: normalizeBingoText(selectedItem.exampleSentence),
    };
    const calledAt = Timestamp.now();
    const callRecord = {
      wordId: normalizedSelectedItem.id,
      word: normalizedSelectedItem.word,
      meaning: normalizedSelectedItem.meaning,
      mode: cleanMode === "tts" ? "tts" : currentSession.mode,
      calledAt,
      calledBy: cleanTeacherUserId || currentSession.teacherUserId,
    };
    const nextCalledWordIds = Array.from(
      new Set([...currentSession.calledWordIds, normalizedSelectedItem.id]),
    );

    transaction.update(sessionRef, {
      selectedUnits: currentSession.selectedUnits,
      selectedUnitLabels: currentSession.selectedUnitLabels,
      requiredCellCount: currentSession.requiredCellCount || currentSession.boardSize * currentSession.boardSize,
      activeWordId: normalizedSelectedItem.id,
      activeWordText: normalizedSelectedItem.word,
      activeWordMeaning: normalizedSelectedItem.meaning,
      callSequence: [...currentSession.callSequence, callRecord],
      calledWordIds: nextCalledWordIds,
      updatedAt: serverTimestamp(),
    });

    return {
      sessionId: cleanSessionId,
      sessionCode: cleanSessionId,
      activeWord: normalizedSelectedItem,
      callRecord,
    };
  });
}

export async function drawNextBingoWord({
  sessionId,
  teacherUserId,
  mode,
  random = Math.random,
}) {
  const { db: firestore } = ensureFirebase();
  const cleanSessionId = String(sessionId ?? "").trim().toUpperCase();
  const sessionRef = createBingoSessionRef(firestore, cleanSessionId);
  const cleanTeacherUserId = normalizeBingoText(teacherUserId);
  const cleanMode = normalizeBingoText(mode).toLowerCase();

  return runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(sessionRef);

    if (!snapshot.exists()) {
      throw new Error("빙고 세션을 찾을 수 없습니다.");
    }

    const currentSession = normalizeBingoSessionDocument(snapshot.data(), {
      sessionCode: cleanSessionId,
    });

    if (
      cleanTeacherUserId
      && currentSession.teacherUserId
      && currentSession.teacherUserId !== cleanTeacherUserId
    ) {
      throw new Error("이 빙고 세션의 교사가 아닙니다.");
    }

    const nextWord = selectNextBingoWord(
      currentSession.vocabularyItems,
      currentSession.calledWordIds,
      random,
    );

    if (!nextWord) {
      throw new Error("호출할 단어가 더 이상 없습니다.");
    }

    const nextWordId = createBingoWordId(nextWord);
    const calledAt = Timestamp.now();
    const callRecord = {
      wordId: nextWordId,
      word: normalizeBingoText(nextWord.word),
      meaning: normalizeBingoText(nextWord.meaning),
      mode: cleanMode === "tts" ? "tts" : currentSession.mode,
      calledAt,
      calledBy: currentSession.teacherUserId,
      isRandomDraw: true,
    };
    const nextCalledWordIds = Array.from(
      new Set([...currentSession.calledWordIds, nextWordId]),
    );

    transaction.update(sessionRef, {
      selectedUnits: currentSession.selectedUnits,
      selectedUnitLabels: currentSession.selectedUnitLabels,
      requiredCellCount: currentSession.requiredCellCount || currentSession.boardSize * currentSession.boardSize,
      activeWordId: nextWordId,
      activeWordText: normalizeBingoText(nextWord.word),
      activeWordMeaning: normalizeBingoText(nextWord.meaning),
      callSequence: [...currentSession.callSequence, callRecord],
      calledWordIds: nextCalledWordIds,
      updatedAt: serverTimestamp(),
    });

    return {
      sessionId: cleanSessionId,
      sessionCode: cleanSessionId,
      activeWord: {
        id: nextWordId,
        word: normalizeBingoText(nextWord.word),
        meaning: normalizeBingoText(nextWord.meaning),
      },
      callRecord,
    };
  });
}

export async function markBingoCell({
  sessionId,
  playerId,
  wordId,
}) {
  const { db: firestore } = ensureFirebase();
  const cleanSessionId = String(sessionId ?? "").trim().toUpperCase();
  const cleanPlayerId = String(playerId ?? "").trim();
  const cleanWordId = String(wordId ?? "").trim();
  const sessionRef = createBingoSessionRef(firestore, cleanSessionId);
  const playerRef = createBingoPlayerRef(firestore, cleanSessionId, cleanPlayerId);

  return runTransaction(firestore, async (transaction) => {
    const [sessionSnapshot, playerSnapshot] = await Promise.all([
      transaction.get(sessionRef),
      transaction.get(playerRef),
    ]);

    if (!sessionSnapshot.exists()) {
      throw new Error("빙고 세션을 찾을 수 없습니다.");
    }

    if (!playerSnapshot.exists()) {
      throw new Error("빙고 참가자를 찾을 수 없습니다.");
    }

    const sessionData = normalizeBingoSessionDocument(sessionSnapshot.data(), {
      sessionCode: cleanSessionId,
    });
    const playerData = normalizeBingoPlayerDocument(playerSnapshot.data(), {
      studentName: playerSnapshot.data()?.studentName,
      boardSize: playerSnapshot.data()?.boardSize,
      setupStatus: playerSnapshot.data()?.setupStatus,
      boardCells: playerSnapshot.data()?.boardCells,
      markedWordIds: playerSnapshot.data()?.markedWordIds,
      availableWords: playerSnapshot.data()?.availableWords,
      requiredCellCount: playerSnapshot.data()?.requiredCellCount,
      bingoRank: playerSnapshot.data()?.bingoRank,
      hasBingo: playerSnapshot.data()?.hasBingo,
    });
    const activeWordId = normalizeBingoText(sessionData.activeWordId);

    if (!activeWordId) {
      throw new Error("현재 호출된 단어가 없습니다.");
    }

    if (playerData.setupStatus !== "ready") {
      throw new Error("빙고판 배치가 완료된 후에만 체크할 수 있습니다.");
    }

    const boardCell = playerData.boardCells.find(
      (cell) => cell.wordId === cleanWordId,
    );

    if (!boardCell) {
      throw new Error("빙고판에 없는 단어입니다.");
    }

    if (!canMarkBingoCell({
      activeWordId,
      activeWordText: sessionData.activeWordText,
      cellWordId: cleanWordId,
      cellWordText: boardCell.word,
      alreadyMarked: playerData.markedWordIds.includes(cleanWordId),
    })) {
      throw new Error("현재 호출된 단어만 체크할 수 있습니다.");
    }

    const nextMarkedWordIds = Array.from(
      new Set([...playerData.markedWordIds, cleanWordId]),
    );
    const bingoLinesResult = computeBingoLines(
      nextMarkedWordIds,
      playerData.boardCells,
      playerData.boardSize,
    );
    const nextBingoLines = bingoLinesResult.bingoLines;
    const nextHasBingo = nextBingoLines >= 3;

    transaction.update(playerRef, {
      markedWordIds: nextMarkedWordIds,
      bingoLines: nextBingoLines,
      completedLineKeys: bingoLinesResult.completedLineKeys,
      hasBingo: nextHasBingo,
      bingoRank: playerData.bingoRank ?? (nextHasBingo ? 1 : null),
      updatedAt: serverTimestamp(),
    });

    return {
      sessionId: cleanSessionId,
      playerId: cleanPlayerId,
      markedWordId: cleanWordId,
      bingoLines: nextBingoLines,
      completedLineKeys: bingoLinesResult.completedLineKeys,
      hasBingo: nextHasBingo,
      isBingo: nextHasBingo && !playerData.hasBingo,
      session: {
        id: sessionSnapshot.id,
        ...sessionData,
      },
      player: {
        id: playerSnapshot.id,
        ...playerData,
        markedWordIds: nextMarkedWordIds,
        bingoLines: nextBingoLines,
        completedLineKeys: bingoLinesResult.completedLineKeys,
        hasBingo: nextHasBingo,
        bingoRank: playerData.bingoRank ?? (nextHasBingo ? 1 : null),
      },
    };
  });
}

export async function endBingoSession({
  sessionId,
  teacherUserId,
}) {
  const { db: firestore } = ensureFirebase();
  const cleanSessionId = String(sessionId ?? "").trim().toUpperCase();
  const cleanTeacherUserId = normalizeBingoText(teacherUserId);
  const sessionRef = createBingoSessionRef(firestore, cleanSessionId);

  return runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(sessionRef);

    if (!snapshot.exists()) {
      throw new Error("빙고 세션을 찾을 수 없습니다.");
    }

    const currentSession = normalizeBingoSessionDocument(snapshot.data(), {
      sessionCode: cleanSessionId,
    });

    if (
      cleanTeacherUserId
      && currentSession.teacherUserId
      && currentSession.teacherUserId !== cleanTeacherUserId
    ) {
      throw new Error("이 빙고 세션의 교사가 아닙니다.");
    }

    transaction.update(sessionRef, {
      status: "finished",
      finishedAt: serverTimestamp(),
      finishedBy: cleanTeacherUserId || currentSession.teacherUserId,
      selectedUnits: currentSession.selectedUnits,
      selectedUnitLabels: currentSession.selectedUnitLabels,
      requiredCellCount: currentSession.requiredCellCount || currentSession.boardSize * currentSession.boardSize,
      updatedAt: serverTimestamp(),
    });

    return {
      sessionId: cleanSessionId,
      sessionCode: cleanSessionId,
      status: "finished",
    };
  });
}
