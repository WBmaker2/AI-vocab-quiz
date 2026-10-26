import { createFishingLeaderboardPayload, createMatchingLeaderboardPayload, createTypingLeaderboardPayload, pickBetterTypingLeaderboardEntry, shouldReplaceElapsedLeaderboardEntry } from "./firebaseLeaderboardPayloads.js";
import { normalizeLeaderboardScope } from "./firebaseLeaderboardValidation.js";
import { createMatchingLeaderboardScopeKey } from "../utils/leaderboard.js";
import { ensureFirebase } from "./firebaseCore.js";
import { collection, doc, getDocs, query, runTransaction, serverTimestamp } from "firebase/firestore";

export async  function upsertMatchingLeaderboardPeriod({
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
    const existingElapsedSeconds = Number(
      snapshot.data().elapsedSeconds ?? Number.POSITIVE_INFINITY,
    );
    const shouldUpdate = shouldReplaceElapsedLeaderboardEntry({
      nextScore: payload.score,
      nextElapsedSeconds: payload.elapsedSeconds,
      existingScore,
      existingElapsedSeconds,
    });

    if (shouldUpdate) {
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

export async  function upsertFishingLeaderboardPeriod({
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
    const existingElapsedSeconds = Number(
      snapshot.data().elapsedSeconds ?? Number.POSITIVE_INFINITY,
    );
    const shouldUpdate = shouldReplaceElapsedLeaderboardEntry({
      nextScore: payload.score,
      nextElapsedSeconds: payload.elapsedSeconds,
      existingScore,
      existingElapsedSeconds,
    });

    if (shouldUpdate) {
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

export async  function upsertTypingLeaderboardPeriod({
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

export async  function fetchMatchingLeaderboardPeriod({
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

export async  function fetchFishingLeaderboardPeriod({
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

export async  function fetchTypingLeaderboardPeriod({
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
