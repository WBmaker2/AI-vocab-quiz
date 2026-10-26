import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth, authPersistenceReady, ensureFirebase } from "./firebaseCore.js";
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";

export function normalizeSchoolName(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

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
  await authPersistenceReady;
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

export async  function listPublishedSchools() {
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
