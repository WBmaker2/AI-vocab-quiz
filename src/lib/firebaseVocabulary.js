import { createTeacherProfileWriteData, createVocabularySetId } from "./firebaseSchools.js";
import { ensureFirebase } from "./firebaseCore.js";
import { assertTeacherVocabularyImportBatchCapacity } from "../utils/teacherSetManager.js";
import { collection, deleteDoc, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, where, writeBatch } from "firebase/firestore";

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

export function prepareTeacherVocabularyImportBatch({
  userId,
  teacherProfile,
  grade,
  publisher,
  gradePublishers,
  published,
  vocabularySets,
}) {
  const cleanUserId = String(userId ?? "").trim();
  const cleanGrade = String(grade ?? "").trim();
  const cleanPublisher = String(publisher ?? "").trim();
  const cleanTeacherName = String(teacherProfile?.teacherName ?? "").trim();
  const cleanSchoolId = String(teacherProfile?.schoolId ?? "").trim();
  const cleanSchoolName = String(teacherProfile?.schoolName ?? "").trim();

  if (!cleanUserId || !cleanGrade || !cleanPublisher) {
    throw new Error("엑셀 가져오기에 필요한 선생님, 학년, 출판사 정보가 없습니다.");
  }

  if (!cleanTeacherName || !cleanSchoolId || !cleanSchoolName) {
    throw new Error("선생님 학교 정보가 완전하지 않아 엑셀을 가져올 수 없습니다.");
  }

  if (!Array.isArray(vocabularySets) || vocabularySets.length === 0) {
    throw new Error("엑셀 가져오기 계획에 저장할 단원이 없습니다.");
  }

  assertTeacherVocabularyImportBatchCapacity(vocabularySets.length);

  const units = new Set();
  const preparedSets = vocabularySets.map((set) => {
    const unit = String(set?.unit ?? "").trim();
    if (!unit || units.has(unit)) {
      throw new Error("엑셀 가져오기 계획에 중복되었거나 비어 있는 단원이 있습니다.");
    }
    units.add(unit);

    return {
      unit,
      items: Array.isArray(set.items) ? set.items : [],
    };
  });

  return {
    userId: cleanUserId,
    teacherProfile: {
      teacherName: cleanTeacherName,
      schoolId: cleanSchoolId,
      schoolName: cleanSchoolName,
    },
    grade: cleanGrade,
    publisher: cleanPublisher,
    gradePublishers: gradePublishers ?? {},
    published: Boolean(published),
    vocabularySets: preparedSets,
  };
}

export async  function writeTeacherVocabularyImportBatch(plan, {
  firestore,
  createBatch = writeBatch,
  createDocumentRef = doc,
  createServerTimestamp = serverTimestamp,
}) {
  const batch = createBatch(firestore);
  const teacherRef = createDocumentRef(firestore, "teachers", plan.userId);

  batch.set(
    teacherRef,
    {
      ...createTeacherProfileWriteData({
        teacherName: plan.teacherProfile.teacherName,
        schoolId: plan.teacherProfile.schoolId,
        schoolName: plan.teacherProfile.schoolName,
        gradePublishers: plan.gradePublishers,
        isNew: false,
      }),
      updatedAt: createServerTimestamp(),
    },
    { merge: true },
  );

  plan.vocabularySets.forEach((set) => {
    const setRef = createDocumentRef(
      firestore,
      "vocabularySets",
      createVocabularySetId(plan.userId, plan.grade, set.unit),
    );
    batch.set(
      setRef,
      {
        ownerUid: plan.userId,
        schoolId: plan.teacherProfile.schoolId,
        schoolName: plan.teacherProfile.schoolName,
        teacherName: plan.teacherProfile.teacherName,
        grade: plan.grade,
        unit: set.unit,
        publisher: plan.publisher,
        published: plan.published,
        sourceType: "xlsx",
        items: set.items,
        updatedAt: createServerTimestamp(),
      },
      { merge: true },
    );
  });

  await batch.commit();
}

export function createTeacherVocabularyImportBatchWriter(dependencies) {
  return async (input) => {
    const plan = prepareTeacherVocabularyImportBatch(input);
    return writeTeacherVocabularyImportBatch(plan, dependencies);
  };
}

export async function saveTeacherVocabularyImportBatch(input) {
  // Validate the plan before Firebase access so oversized imports never issue reads or writes.
  const plan = prepareTeacherVocabularyImportBatch(input);
  const { db: firestore } = ensureFirebase();

  return writeTeacherVocabularyImportBatch(plan, { firestore });
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
