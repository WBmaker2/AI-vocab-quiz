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
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAt,
  endAt,
  updateDoc,
  where,
  deleteDoc,
} from "firebase/firestore";

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
  const { db: firestore } = ensureFirebase();
  const normalized = normalizeSchoolName(queryText);

  if (!normalized) {
    return [];
  }

  const schoolsQuery = query(
    collection(firestore, "schools"),
    orderBy("normalizedName"),
    startAt(normalized),
    endAt(`${normalized}\uf8ff`),
    limit(8),
  );

  const snapshot = await getDocs(schoolsQuery);
  return snapshot.docs.map((item) => ({
    id: item.id,
    name: item.data().name,
  }));
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
  };
}

export async function upsertTeacherProfile({ userId, teacherName, schoolId, schoolName }) {
  const { db: firestore } = ensureFirebase();
  const teacherRef = doc(firestore, "teachers", userId);
  const teacherSnapshot = await getDoc(teacherRef);

  const payload = {
    teacherName: teacherName.trim(),
    schoolId,
    schoolName: schoolName.trim(),
    isActive: true,
    updatedAt: serverTimestamp(),
  };

  if (teacherSnapshot.exists()) {
    await updateDoc(teacherRef, payload);
    return;
  }

  await setDoc(teacherRef, {
    ...payload,
    createdAt: serverTimestamp(),
  });
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
    return { items: [], published: false };
  }

  const data = snapshot.docs[0].data();
  return {
    items: data.items ?? [],
    published: Boolean(data.published),
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
