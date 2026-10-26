import { normalizeLeaderboardScope, normalizeLeaderboardText } from "./firebaseLeaderboardValidation.js";
import { BADGE_IDS } from "../constants/badges.js";
import { normalizeStudentNameKey } from "../utils/leaderboard.js";
import {
  buildProgressSummary,
  compareListeningProgress,
  compareMatchingProgress,
  compareSpeakingProgress,
  compareTypingProgress,
  createStudentProfileId,
  evaluateEarnedBadges,
  normalizeStudentProfileName,
  toNonNegativeInteger,
  toNonNegativeNumber,
} from "../utils/studentProgress.js";
import {
  findStudentProfileCapability,
  getOrCreateStudentProfileCapability,
  isStudentProfileCapabilityToken,
} from "../utils/studentProfileCapability.js";
import { ensureFirebase } from "./firebaseCore.js";
import { doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";

export const STUDENT_PROGRESS_ACTIVITY_TYPES = new Set([
  "listening",
  "speaking",
  "matching",
  "typing",
]);

export const STUDENT_BADGE_ID_SET = new Set(BADGE_IDS);

export function normalizeStudentProgressSchoolName(value) {
  return normalizeLeaderboardText(value);
}

export function normalizeStudentProgressGrade(value) {
  return normalizeLeaderboardScope(value);
}

export function normalizeStudentProgressActivityType(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function isStudentProgressActivityType(value) {
  return STUDENT_PROGRESS_ACTIVITY_TYPES.has(
    normalizeStudentProgressActivityType(value),
  );
}

export function createStudentProgressRef(firestore, {
  schoolId,
  grade,
  studentName,
  profileToken,
}) {
  return doc(
    firestore,
    "studentProfiles",
    createStudentProfileId({
      schoolId,
      grade,
      studentName,
      profileToken,
    }),
  );
}
export function normalizeStudentProfileDocument(snapshotData, fallback) {
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
  const profileToken = String(
    snapshotData?.profileToken ?? cleanFallback.profileToken ?? "",
  ).trim();
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
    profileToken: isStudentProfileCapabilityToken(profileToken) ? profileToken : "",
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

export function createNextStudentProfile({
  currentProfile,
  schoolId,
  schoolName,
  grade,
  studentName,
  profileToken,
  activityType,
  comparisonResult,
  newlyEarnedBadges,
}) {
  const persistedSchoolName = currentProfile.schoolName || schoolName;
  const persistedStudentName = currentProfile.studentName || studentName;

  const nextProfile = {
    schoolId,
    schoolName: persistedSchoolName,
    grade,
    studentName: persistedStudentName,
    studentNameNormalized: normalizeStudentNameKey(persistedStudentName),
    profileToken,
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
export async function fetchStudentProfile({ schoolId, grade, studentName }) {
  const { db: firestore } = ensureFirebase();
  const cleanSchoolId = normalizeLeaderboardScope(schoolId);
  const cleanGrade = normalizeStudentProgressGrade(grade);
  const cleanStudentName = normalizeStudentProfileName(studentName);

  if (!cleanSchoolId || !cleanGrade || !cleanStudentName) {
    return null;
  }

  const profileToken = findStudentProfileCapability({
    schoolId: cleanSchoolId,
    grade: cleanGrade,
    studentName: cleanStudentName,
  });

  if (!profileToken) {
    return null;
  }

  const profileRef = createStudentProgressRef(firestore, {
    schoolId: cleanSchoolId,
    grade: cleanGrade,
    studentName: cleanStudentName,
    profileToken,
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

  const profileToken = getOrCreateStudentProfileCapability({
    schoolId: cleanSchoolId,
    grade: cleanGrade,
    studentName: cleanStudentName,
  });

  if (!profileToken) {
    throw new Error(
      "This browser cannot save private growth records because local storage is unavailable.",
    );
  }

  const profileRef = createStudentProgressRef(firestore, {
    schoolId: cleanSchoolId,
    grade: cleanGrade,
    studentName: cleanStudentName,
    profileToken,
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
        profileToken,
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
      profileToken,
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
