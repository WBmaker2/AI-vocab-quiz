import { collection, deleteDoc, doc, getDocs, limit, query, Timestamp, where, writeBatch } from "firebase/firestore";
import { ensureFirebase } from "./firebaseCore.js";

export const WORD_MISS_REPORT_COLLECTION = "wordMissReports";
export const WORD_MISS_ACTIVITY_TYPES = ["listening", "speaking", "typing"];
export const MAX_WORD_MISS_REPORTS_PER_SESSION = 10;
export const MAX_WORD_MISS_REPORT_TEXT_LENGTH = 100;

export function normalizeWordMissText(value) {
  return String(value ?? "").trim().slice(0, MAX_WORD_MISS_REPORT_TEXT_LENGTH);
}

export function normalizeWordMissReport({
  schoolId,
  schoolName,
  grade,
  unit,
  teacherUserId,
  teacherName,
  word,
  meaning,
  activityType,
}) {
  const cleanSchoolId = String(schoolId ?? "").trim();
  const cleanGrade = String(grade ?? "").trim();
  const cleanTeacherUserId = String(teacherUserId ?? "").trim();
  const cleanWord = normalizeWordMissText(word);

  if (!cleanSchoolId || !cleanGrade || !cleanTeacherUserId || !cleanWord) {
    return null;
  }

  if (!WORD_MISS_ACTIVITY_TYPES.includes(activityType)) {
    return null;
  }

  return {
    schoolId: cleanSchoolId,
    schoolName: String(schoolName ?? "").trim(),
    grade: cleanGrade,
    unit: String(unit ?? "").trim(),
    teacherUserId: cleanTeacherUserId,
    teacherName: String(teacherName ?? "").trim(),
    word: cleanWord,
    meaning: normalizeWordMissText(meaning),
    activityType,
  };
}

export async function saveWordMissReports({
  schoolId,
  schoolName,
  grade,
  unit,
  teacherUserId,
  teacherName,
  activityType,
  misses,
  now = new Date(),
}) {
  const { db: firestore } = ensureFirebase();
  const seen = new Set();
  const reports = [];

  for (const miss of Array.isArray(misses) ? misses : []) {
    const key = String(miss?.word ?? "").trim().toLowerCase();

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    const report = normalizeWordMissReport({
      schoolId,
      schoolName,
      grade,
      unit,
      teacherUserId,
      teacherName,
      word: miss?.word,
      meaning: miss?.meaning,
      activityType,
    });

    if (report) {
      reports.push(report);
    }

    if (reports.length >= MAX_WORD_MISS_REPORTS_PER_SESSION) {
      break;
    }
  }

  if (reports.length === 0) {
    return { savedCount: 0 };
  }

  const createdAt = Timestamp.fromDate(now instanceof Date ? now : new Date(now));
  const batch = writeBatch(firestore);

  for (const report of reports) {
    batch.set(doc(collection(firestore, WORD_MISS_REPORT_COLLECTION)), {
      ...report,
      createdAt,
    });
  }

  await batch.commit();
  return { savedCount: reports.length };
}

export async function listWordMissReports({ schoolId, limitCount = 200 }) {
  const { db: firestore } = ensureFirebase();
  const cleanSchoolId = String(schoolId ?? "").trim();

  if (!cleanSchoolId) {
    return [];
  }

  const snapshot = await getDocs(
    query(
      collection(firestore, WORD_MISS_REPORT_COLLECTION),
      where("schoolId", "==", cleanSchoolId),
      limit(Math.max(1, Math.min(500, Number(limitCount) || 200))),
    ),
  );
  const reports = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
  reports.sort((left, right) => {
    const leftMillis = left.createdAt?.toMillis?.() ?? 0;
    const rightMillis = right.createdAt?.toMillis?.() ?? 0;
    return rightMillis - leftMillis;
  });
  return reports;
}

export async function clearWordMissReports({ reportIds }) {
  const { db: firestore } = ensureFirebase();
  const ids = Array.from(
    new Set((Array.isArray(reportIds) ? reportIds : []).map((id) => String(id ?? "").trim()).filter(Boolean)),
  ).slice(0, 200);

  if (ids.length === 0) {
    return { deletedCount: 0 };
  }

  const batch = writeBatch(firestore);

  for (const id of ids) {
    batch.delete(doc(firestore, WORD_MISS_REPORT_COLLECTION, id));
  }

  await batch.commit();
  return { deletedCount: ids.length };
}
