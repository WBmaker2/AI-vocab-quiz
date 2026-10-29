import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth, authPersistenceReady, ensureFirebase } from "./firebaseCore.js";
import { collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import {
  createSchoolSearchRange,
  normalizeSchoolSearchName,
} from "../utils/schoolSearch.js";

export const normalizeSchoolName = normalizeSchoolSearchName;

const PUBLISHED_SCHOOL_CACHE_KEY = "publishedSchools.v1";
const PUBLISHED_SCHOOL_CACHE_TTL_MS = 5 * 60 * 1000;

export function createSchoolId(normalizedName) {
  return encodeURIComponent(normalizedName);
}

export function normalizeUnitKey(unit) {
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
  try {
    if (authPersistenceReady) {
      await authPersistenceReady;
    }
  } catch {
    // Ignore persistence readiness failures and attempt sign-in anyway.
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  await signInWithPopup(firebaseAuth, provider);
}

export async function signOutCurrentUser() {
  const { auth: firebaseAuth } = ensureFirebase();
  await signOut(firebaseAuth);
}

export async function searchSchoolsByName(queryText) {
  const normalized = normalizeSchoolSearchName(queryText);
  const range = createSchoolSearchRange(normalized);

  if (!range) {
    return [];
  }

  const { db: firestore } = ensureFirebase();
  const snapshot = await getDocs(
    query(
      collection(firestore, "schools"),
      where("normalizedName", ">=", range.start),
      where("normalizedName", "<", range.end),
      orderBy("normalizedName"),
      limit(8),
    ),
  );

  const schools = snapshot.docs
    .map((item) => ({
      id: item.id,
      name: String(item.data().name ?? "").trim(),
      normalizedName: String(item.data().normalizedName ?? "").trim(),
    }))
    .filter((school) => school.name && school.normalizedName);

  if (schools.length > 0) {
    return schools.slice(0, 8).map(({ id, name }) => ({ id, name }));
  }

  return searchPublishedSchoolsFallback(normalized);
}

async function searchPublishedSchoolsFallback(normalized) {
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

function readPublishedSchoolsCache() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(PUBLISHED_SCHOOL_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    if (Date.now() - Number(parsed.savedAt ?? 0) > PUBLISHED_SCHOOL_CACHE_TTL_MS) {
      return null;
    }

    return Array.isArray(parsed.schools) ? parsed.schools : null;
  } catch {
    return null;
  }
}

function writePublishedSchoolsCache(schools) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      PUBLISHED_SCHOOL_CACHE_KEY,
      JSON.stringify({ savedAt: Date.now(), schools }),
    );
  } catch {
    // Cache failures must not block school search.
  }
}

export async function listPublishedSchools() {
  const cachedSchools = readPublishedSchoolsCache();

  if (cachedSchools) {
    return cachedSchools;
  }

  const { db: firestore } = ensureFirebase();
  const snapshot = await getDocs(
    query(collection(firestore, "vocabularySets"), where("published", "==", true)),
  );

  const schoolUsage = new Map();

  snapshot.docs.forEach((item) => {
    const data = item.data();
    const schoolId = String(data.schoolId ?? "").trim();
    const schoolName = String(data.schoolName ?? "").trim();
    const normalizedName = normalizeSchoolSearchName(schoolName);

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

  const schools = Array.from(schoolUsage.values())
    .sort((left, right) => {
      const countCompare = right.setCount - left.setCount;
      if (countCompare !== 0) {
        return countCompare;
      }

      return String(left.name).localeCompare(String(right.name), undefined, {
        sensitivity: "base",
      });
    });

  writePublishedSchoolsCache(schools);

  return schools;
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
    isActive: data.isActive === true,
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
  const teacherSnapshot = await getDoc(teacherRef);

  if (teacherSnapshot.exists()) {
    await updateDoc(teacherRef, {
      ...createTeacherProfileWriteData({
        teacherName,
        schoolId,
        schoolName,
        gradePublishers,
        isNew: false,
      }),
      updatedAt: serverTimestamp(),
    });
    return { isActive: teacherSnapshot.data().isActive === true };
  }

  await setDoc(teacherRef, {
    ...createTeacherProfileWriteData({
      teacherName,
      schoolId,
      schoolName,
      gradePublishers,
      isNew: true,
    }),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { isActive: false };
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
export function createTeacherProfileWriteData({
  teacherName,
  schoolId,
  schoolName,
  gradePublishers = {},
  isNew,
}) {
  const selfServiceData = {
    teacherName: String(teacherName ?? "").trim(),
    gradePublishers,
  };

  if (!isNew) {
    return selfServiceData;
  }

  return {
    ...selfServiceData,
    schoolId,
    schoolName: String(schoolName ?? "").trim(),
    isActive: false,
  };
}
