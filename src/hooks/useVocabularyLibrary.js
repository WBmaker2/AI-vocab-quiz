import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_STUDENT_SELECTION,
  DEFAULT_TEACHER_SELECTION,
  createDraftVocabularyItem,
  formatSetLabel,
  getUnitsForGrade,
  normalizeDraftVocabulary,
} from "../constants/vocabulary.js";
import {
  deleteTeacherVocabularySet,
  fetchPublishedVocabularySet,
  fetchTeacherVocabularySet,
  findOrCreateSchool,
  getCurrentUser,
  getTeacherProfile,
  isFirebaseConfigured,
  listPublishedUnitsForTeacher,
  listTeacherSetCatalog,
  listTeachersForSchool,
  saveTeacherVocabularySet,
  searchSchoolsByName,
  signInWithGoogle,
  signOutCurrentUser,
  subscribeToAuthChanges,
  upsertTeacherProfile,
} from "../lib/firebase.js";
import { parseVocabularyWorkbook } from "../utils/xlsxImport.js";

const SAMPLE_ITEMS = [
  {
    word: "apple",
    meaning: "사과",
    imageHint: "red fruit",
    exampleSentence: "I eat an apple.",
  },
  {
    word: "banana",
    meaning: "바나나",
    imageHint: "yellow fruit",
    exampleSentence: "Monkeys like bananas.",
  },
  {
    word: "school",
    meaning: "학교",
    imageHint: "classroom building",
    exampleSentence: "We go to school every day.",
  },
];

const EMPTY_ONBOARDING = {
  schoolName: "",
  teacherName: "",
  suggestions: [],
  searching: false,
  saving: false,
  status: "",
  error: "",
};

function normalizeErrorMessage(error, fallback) {
  if (!error) {
    return fallback;
  }

  return error.message || fallback;
}

export function useVocabularyLibrary() {
  const [authLoading, setAuthLoading] = useState(isFirebaseConfigured);
  const [authError, setAuthError] = useState("");
  const [session, setSession] = useState(null);

  const [teacherProfileLoading, setTeacherProfileLoading] = useState(false);
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [teacherProfileError, setTeacherProfileError] = useState("");
  const [onboarding, setOnboarding] = useState(EMPTY_ONBOARDING);

  const [teacherCatalog, setTeacherCatalog] = useState([]);
  const [teacherCatalogLoading, setTeacherCatalogLoading] = useState(false);
  const [teacherSelection, setTeacherSelection] = useState(
    DEFAULT_TEACHER_SELECTION,
  );
  const [teacherItems, setTeacherItems] = useState([]);
  const [teacherPublished, setTeacherPublished] = useState(false);
  const [teacherDirty, setTeacherDirty] = useState(false);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teacherSaving, setTeacherSaving] = useState(false);
  const [teacherImporting, setTeacherImporting] = useState(false);
  const [teacherStatus, setTeacherStatus] = useState("");
  const [teacherError, setTeacherError] = useState("");

  const [studentSchoolQuery, setStudentSchoolQuery] = useState("");
  const [studentSchoolResults, setStudentSchoolResults] = useState([]);
  const [studentSchoolSearchLoading, setStudentSchoolSearchLoading] =
    useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [studentTeachers, setStudentTeachers] = useState([]);
  const [studentTeachersLoading, setStudentTeachersLoading] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [studentSelection, setStudentSelection] = useState(
    DEFAULT_STUDENT_SELECTION,
  );
  const [studentUnits, setStudentUnits] = useState([]);
  const [studentUnitsLoading, setStudentUnitsLoading] = useState(false);
  const [studentItems, setStudentItems] = useState([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentStatus, setStudentStatus] = useState("");
  const [studentError, setStudentError] = useState("");

  const userId = session?.user?.uid ?? "";

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAuthLoading(false);
      return;
    }

    let cancelled = false;

    async function bootstrapSession() {
      try {
        const user = getCurrentUser();
        if (!cancelled) {
          setSession(user ? { user } : null);
          setAuthError("");
        }
      } catch (error) {
        if (!cancelled) {
          setAuthError(
            normalizeErrorMessage(error, "로그인 상태를 확인하지 못했습니다."),
          );
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    }

    bootstrapSession();

    const unsubscribe = subscribeToAuthChanges((user) => {
      setSession(user ? { user } : null);
      setAuthLoading(false);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      return;
    }

    if (!userId) {
      setTeacherProfile(null);
      setTeacherProfileError("");
      setTeacherCatalog([]);
      setTeacherItems([]);
      setTeacherPublished(false);
      setTeacherDirty(false);
      setTeacherStatus("");
      setTeacherError("");
      setOnboarding(EMPTY_ONBOARDING);
      return;
    }

    let cancelled = false;

    async function loadTeacherProfileState() {
      setTeacherProfileLoading(true);
      setTeacherProfileError("");

      try {
        const profile = await getTeacherProfile(userId);
        if (!cancelled) {
          setTeacherProfile(profile);
          if (profile) {
            setOnboarding((current) => ({
              ...current,
              schoolName: profile.schoolName,
              teacherName: profile.teacherName,
              status: "",
              error: "",
            }));
          }
        }
      } catch (error) {
        if (!cancelled) {
          setTeacherProfileError(
            normalizeErrorMessage(
              error,
              "선생님 프로필을 불러오지 못했습니다.",
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setTeacherProfileLoading(false);
        }
      }
    }

    loadTeacherProfileState();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!isFirebaseConfigured || !teacherProfile?.userId) {
      return;
    }

    refreshTeacherCatalog(teacherProfile.userId);
  }, [teacherProfile?.userId]);

  useEffect(() => {
    if (!isFirebaseConfigured || teacherProfile || !userId) {
      return;
    }

    const schoolName = onboarding.schoolName.trim();
    if (schoolName.length < 2) {
      setOnboarding((current) => ({
        ...current,
        suggestions: [],
        searching: false,
      }));
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setOnboarding((current) => ({ ...current, searching: true }));

      try {
        const suggestions = await searchSchoolsByName(schoolName);
        if (!cancelled) {
          setOnboarding((current) => ({
            ...current,
            suggestions,
            searching: false,
          }));
        }
      } catch {
        if (!cancelled) {
          setOnboarding((current) => ({
            ...current,
            suggestions: [],
            searching: false,
          }));
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [onboarding.schoolName, teacherProfile, userId]);

  async function refreshTeacherCatalog(nextUserId = userId) {
    if (!isFirebaseConfigured || !nextUserId) {
      return;
    }

    setTeacherCatalogLoading(true);

    try {
      const catalog = await listTeacherSetCatalog(nextUserId);
      setTeacherCatalog(catalog);
    } catch (error) {
      setTeacherError(
        normalizeErrorMessage(error, "내 단어 세트 목록을 불러오지 못했습니다."),
      );
    } finally {
      setTeacherCatalogLoading(false);
    }
  }

  async function beginGoogleSignIn() {
    if (!isFirebaseConfigured) {
      setAuthError("Firebase 설정이 필요합니다.");
      return;
    }

    try {
      setAuthError("");
      await signInWithGoogle();
    } catch (error) {
      setAuthError(
        normalizeErrorMessage(error, "Google 로그인으로 이동하지 못했습니다."),
      );
    }
  }

  async function signOutTeacher() {
    try {
      await signOutCurrentUser();
    } catch (error) {
      setAuthError(
        normalizeErrorMessage(error, "로그아웃하지 못했습니다."),
      );
    }
  }

  function updateOnboardingField(field, value) {
    setOnboarding((current) => ({
      ...current,
      [field]: value,
      status: "",
      error: "",
    }));
  }

  function chooseOnboardingSchool(school) {
    setOnboarding((current) => ({
      ...current,
      schoolName: school.name,
      suggestions: [],
      status: "",
      error: "",
    }));
  }

  async function saveTeacherOnboarding() {
    if (!isFirebaseConfigured) {
      setTeacherProfileError("Firebase 설정이 필요합니다.");
      return;
    }

    const schoolName = onboarding.schoolName.trim();
    const teacherName = onboarding.teacherName.trim();

    if (!userId || !schoolName || !teacherName) {
      setOnboarding((current) => ({
        ...current,
        error: "학교 이름과 선생님 이름을 모두 입력하세요.",
      }));
      return;
    }

    setOnboarding((current) => ({
      ...current,
      saving: true,
      error: "",
      status: "",
    }));

    try {
      const school = await findOrCreateSchool(schoolName);
      await upsertTeacherProfile({
        userId,
        teacherName,
        schoolId: school.id,
        schoolName: school.name,
      });

      const profile = await getTeacherProfile(userId);
      setTeacherProfile(profile);
      setOnboarding((current) => ({
        ...current,
        suggestions: [],
        saving: false,
        status: "선생님 정보를 저장했습니다.",
        error: "",
      }));
    } catch (error) {
      setOnboarding((current) => ({
        ...current,
        saving: false,
        error: normalizeErrorMessage(
          error,
          "선생님 정보를 저장하지 못했습니다.",
        ),
      }));
    }
  }

  function updateTeacherSelection(field, value) {
    setTeacherSelection((current) => ({
      ...current,
      [field]: value,
    }));
    setTeacherStatus("");
    setTeacherError("");
  }

  function setTeacherPublishState(nextPublished) {
    setTeacherPublished(nextPublished);
    setTeacherDirty(true);
    setTeacherStatus("");
  }

  async function loadTeacherSet() {
    if (!isFirebaseConfigured || !userId) {
      setTeacherError("Google 로그인 후 단어 세트를 불러올 수 있습니다.");
      return;
    }

    if (!teacherSelection.grade || !teacherSelection.unit) {
      setTeacherError("학년과 단원을 먼저 선택하세요.");
      return;
    }

    setTeacherLoading(true);
    setTeacherStatus("");
    setTeacherError("");

    try {
      const result = await fetchTeacherVocabularySet(userId, teacherSelection);
      setTeacherItems(result.items);
      setTeacherPublished(result.published);
      setTeacherDirty(false);
      setTeacherStatus(
        result.items.length > 0
          ? `${formatSetLabel(teacherSelection)} 세트를 불러왔습니다.`
          : `${formatSetLabel(teacherSelection)}에 저장된 단어가 아직 없습니다.`,
      );
    } catch (error) {
      setTeacherError(
        normalizeErrorMessage(error, "단어 세트를 불러오지 못했습니다."),
      );
    } finally {
      setTeacherLoading(false);
    }
  }

  async function saveTeacherSet() {
    if (!isFirebaseConfigured || !teacherProfile || !userId) {
      setTeacherError("Google 로그인과 선생님 정보 등록이 필요합니다.");
      return;
    }

    if (!teacherSelection.grade || !teacherSelection.unit) {
      setTeacherError("학년과 단원을 먼저 선택하세요.");
      return;
    }

    setTeacherSaving(true);
    setTeacherStatus("");
    setTeacherError("");

    try {
      await saveTeacherVocabularySet({
        userId,
        schoolId: teacherProfile.schoolId,
        schoolName: teacherProfile.schoolName,
        teacherName: teacherProfile.teacherName,
        selection: teacherSelection,
        items: teacherItems,
        published: teacherPublished,
        sourceType: "manual",
      });
      setTeacherDirty(false);
      setTeacherStatus(
        teacherPublished
          ? `${formatSetLabel(teacherSelection)} 세트를 저장하고 학생에게 공개했습니다.`
          : `${formatSetLabel(teacherSelection)} 세트를 저장했습니다. 아직 공개 전입니다.`,
      );
      await refreshTeacherCatalog();
    } catch (error) {
      setTeacherError(
        normalizeErrorMessage(error, "단어 세트를 저장하지 못했습니다."),
      );
    } finally {
      setTeacherSaving(false);
    }
  }

  async function removeTeacherSet() {
    if (!isFirebaseConfigured || !userId) {
      setTeacherError("Google 로그인 후 단어 세트를 삭제할 수 있습니다.");
      return;
    }

    if (!teacherSelection.grade || !teacherSelection.unit) {
      setTeacherError("학년과 단원을 먼저 선택하세요.");
      return;
    }

    setTeacherSaving(true);
    setTeacherStatus("");
    setTeacherError("");

    try {
      await deleteTeacherVocabularySet(userId, teacherSelection);
      setTeacherItems([]);
      setTeacherPublished(false);
      setTeacherDirty(false);
      setTeacherStatus(
        `${formatSetLabel(teacherSelection)} 세트를 삭제했습니다.`,
      );
      await refreshTeacherCatalog();
    } catch (error) {
      setTeacherError(
        normalizeErrorMessage(error, "단어 세트를 삭제하지 못했습니다."),
      );
    } finally {
      setTeacherSaving(false);
    }
  }

  async function importWorkbook(file, grade) {
    if (!isFirebaseConfigured || !teacherProfile || !userId) {
      setTeacherError("Google 로그인과 선생님 정보 등록이 필요합니다.");
      return;
    }

    if (!file) {
      setTeacherError("업로드할 엑셀 파일을 선택하세요.");
      return;
    }

    if (!grade) {
      setTeacherError("엑셀 업로드용 학년을 먼저 선택하세요.");
      return;
    }

    setTeacherImporting(true);
    setTeacherStatus("");
    setTeacherError("");

    try {
      const groupedSets = await parseVocabularyWorkbook(file);

      for (const groupedSet of groupedSets) {
        const existingSet = teacherCatalog.find(
          (entry) => entry.grade === grade && entry.unit === groupedSet.unit,
        );

        await saveTeacherVocabularySet({
          userId,
          schoolId: teacherProfile.schoolId,
          schoolName: teacherProfile.schoolName,
          teacherName: teacherProfile.teacherName,
          selection: { grade, unit: groupedSet.unit },
          items: normalizeDraftVocabulary(groupedSet.items),
          published: existingSet?.published ?? false,
          sourceType: "xlsx",
        });
      }

      await refreshTeacherCatalog();

      const matchedSet = groupedSets.find(
        (groupedSet) =>
          groupedSet.unit === teacherSelection.unit &&
          teacherSelection.grade === grade,
      );

      if (matchedSet) {
        const existingSet = teacherCatalog.find(
          (entry) => entry.grade === grade && entry.unit === matchedSet.unit,
        );
        setTeacherItems(normalizeDraftVocabulary(matchedSet.items));
        setTeacherPublished(existingSet?.published ?? false);
        setTeacherDirty(false);
      }

      setTeacherStatus(
        `${grade}학년 엑셀 업로드를 완료했습니다. ${groupedSets.length}개 단원을 저장했습니다.`,
      );
    } catch (error) {
      setTeacherError(
        normalizeErrorMessage(error, "엑셀 업로드를 처리하지 못했습니다."),
      );
    } finally {
      setTeacherImporting(false);
    }
  }

  function addTeacherItem(item) {
    setTeacherItems((current) => [
      ...current,
      createDraftVocabularyItem(item, current.length),
    ]);
    setTeacherDirty(true);
  }

  function updateTeacherItem(id, nextItem) {
    setTeacherItems((current) =>
      current.map((item, index) =>
        item.id === id
          ? {
              ...item,
              ...nextItem,
              order: index + 1,
            }
          : item,
      ),
    );
    setTeacherDirty(true);
  }

  function removeTeacherItem(id) {
    setTeacherItems((current) =>
      current
        .filter((item) => item.id !== id)
        .map((item, index) => ({
          ...item,
          order: index + 1,
        })),
    );
    setTeacherDirty(true);
  }

  function clearTeacherItems() {
    setTeacherItems([]);
    setTeacherDirty(true);
  }

  function loadSampleItems() {
    setTeacherItems(normalizeDraftVocabulary(SAMPLE_ITEMS));
    setTeacherDirty(true);
    setTeacherStatus(
      "예시 단어를 불러왔습니다. 저장하면 내 단어 세트에 반영됩니다.",
    );
    setTeacherError("");
  }

  function updateStudentSchoolQuery(value) {
    setStudentSchoolQuery(value);
    setStudentStatus("");
    setStudentError("");
  }

  async function searchStudentSchools() {
    if (!isFirebaseConfigured) {
      setStudentError("Firebase 설정이 필요합니다.");
      return;
    }

    const query = studentSchoolQuery.trim();
    if (!query) {
      setStudentError("학교 이름을 먼저 입력하세요.");
      return;
    }

    setStudentSchoolSearchLoading(true);
    setStudentError("");
    setStudentStatus("");

    try {
      const schools = await searchSchoolsByName(query);
      setStudentSchoolResults(schools);
      setSelectedSchool(null);
      setSelectedTeacher(null);
      setStudentTeachers([]);
      setStudentUnits([]);
      setStudentItems([]);
      setStudentSelection(DEFAULT_STUDENT_SELECTION);
      setStudentStatus(
        schools.length > 0
          ? `${schools.length}개의 학교를 찾았습니다.`
          : "검색 결과가 없습니다. 학교 이름을 다시 확인하세요.",
      );
    } catch (error) {
      setStudentError(
        normalizeErrorMessage(error, "학교 목록을 불러오지 못했습니다."),
      );
    } finally {
      setStudentSchoolSearchLoading(false);
    }
  }

  async function chooseStudentSchool(school) {
    if (!isFirebaseConfigured) {
      return;
    }

    setSelectedSchool(school);
    setSelectedTeacher(null);
    setStudentTeachers([]);
    setStudentUnits([]);
    setStudentItems([]);
    setStudentSelection(DEFAULT_STUDENT_SELECTION);
    setStudentTeachersLoading(true);
    setStudentStatus("");
    setStudentError("");

    try {
      const teachers = await listTeachersForSchool(school.id);
      setStudentTeachers(teachers);
      setStudentStatus(
        teachers.length > 0
          ? `${school.name}의 선생님 목록을 불러왔습니다.`
          : "이 학교에 등록된 선생님 정보가 아직 없습니다.",
      );
    } catch (error) {
      setStudentError(
        normalizeErrorMessage(error, "선생님 목록을 불러오지 못했습니다."),
      );
    } finally {
      setStudentTeachersLoading(false);
    }
  }

  async function refreshStudentUnits(nextTeacher = selectedTeacher, nextGrade) {
    if (!isFirebaseConfigured || !nextTeacher?.userId) {
      setStudentUnits([]);
      return;
    }

    setStudentUnitsLoading(true);
    setStudentError("");
    setStudentStatus("");

    try {
      const units = await listPublishedUnitsForTeacher(
        nextTeacher.userId,
        nextGrade,
      );
      setStudentUnits(units);
      setStudentStatus(
        units.length > 0
          ? `${nextGrade}학년에서 공개된 ${units.length}개 단원을 찾았습니다.`
          : "선택한 학년에서 공개된 단원이 아직 없습니다.",
      );
    } catch (error) {
      setStudentError(
        normalizeErrorMessage(error, "공개 단원 목록을 불러오지 못했습니다."),
      );
    } finally {
      setStudentUnitsLoading(false);
    }
  }

  async function chooseStudentTeacher(teacherUserId) {
    const teacher = studentTeachers.find((entry) => entry.userId === teacherUserId);
    setSelectedTeacher(teacher ?? null);
    setStudentItems([]);
    setStudentUnits([]);
    setStudentSelection((current) => ({
      ...current,
      unit: "",
    }));

    if (teacher) {
      await refreshStudentUnits(teacher, studentSelection.grade);
    }
  }

  async function updateStudentSelection(field, value) {
    setStudentItems([]);
    setStudentError("");
    setStudentStatus("");

    if (field === "grade") {
      setStudentSelection((current) => ({
        ...current,
        grade: value,
        unit: "",
      }));
      setStudentUnits([]);
      if (selectedTeacher) {
        await refreshStudentUnits(selectedTeacher, value);
      }
      return;
    }

    setStudentSelection((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function loadStudentSet() {
    if (!isFirebaseConfigured) {
      setStudentError("Firebase 설정이 필요합니다.");
      return;
    }

    if (!selectedSchool || !selectedTeacher || !studentSelection.unit) {
      setStudentError("학교, 선생님, 학년, 단원을 모두 선택하세요.");
      return;
    }

    setStudentLoading(true);
    setStudentStatus("");
    setStudentError("");

    try {
      const items = await fetchPublishedVocabularySet({
        teacherUserId: selectedTeacher.userId,
        grade: studentSelection.grade,
        unit: studentSelection.unit,
      });
      setStudentItems(items);
      setStudentStatus(
        items.length > 0
          ? `${selectedTeacher.teacherName} 선생님의 ${formatSetLabel(studentSelection)} 세트를 불러왔습니다.`
          : "선택한 조건에 공개된 단어가 없습니다.",
      );
    } catch (error) {
      setStudentError(
        normalizeErrorMessage(error, "학생용 단어 세트를 불러오지 못했습니다."),
      );
    } finally {
      setStudentLoading(false);
    }
  }

  const teacherUnits = useMemo(
    () => getUnitsForGrade(teacherCatalog, teacherSelection.grade),
    [teacherCatalog, teacherSelection.grade],
  );

  const currentTeacherCatalogEntry = useMemo(
    () =>
      teacherCatalog.find(
        (entry) =>
          entry.grade === teacherSelection.grade &&
          entry.unit === teacherSelection.unit,
      ) ?? null,
    [teacherCatalog, teacherSelection.grade, teacherSelection.unit],
  );

  const requiresTeacherOnboarding =
    Boolean(userId) &&
    !teacherProfileLoading &&
    !teacherProfile &&
    !teacherProfileError;

  return {
    remoteConfigured: isFirebaseConfigured,
    auth: {
      loading: authLoading,
      error: authError,
      session,
      signedIn: Boolean(userId),
      signInWithGoogle: beginGoogleSignIn,
      signOut: signOutTeacher,
    },
    teacher: {
      profileLoading: teacherProfileLoading,
      profileError: teacherProfileError,
      profile: teacherProfile,
      requiresOnboarding: requiresTeacherOnboarding,
      onboarding: {
        ...onboarding,
        updateField: updateOnboardingField,
        chooseSchool: chooseOnboardingSchool,
        save: saveTeacherOnboarding,
      },
      selection: teacherSelection,
      items: teacherItems,
      published: teacherPublished,
      dirty: teacherDirty,
      loading: teacherLoading || teacherCatalogLoading,
      saving: teacherSaving,
      importing: teacherImporting,
      status: teacherStatus,
      error: teacherError,
      units: teacherUnits,
      catalogEntry: currentTeacherCatalogEntry,
      updateSelection: updateTeacherSelection,
      setPublished: setTeacherPublishState,
      loadSet: loadTeacherSet,
      saveSet: saveTeacherSet,
      deleteSet: removeTeacherSet,
      importWorkbook,
      addItem: addTeacherItem,
      updateItem: updateTeacherItem,
      removeItem: removeTeacherItem,
      clearItems: clearTeacherItems,
      loadSampleItems,
    },
    student: {
      schoolQuery: studentSchoolQuery,
      schoolResults: studentSchoolResults,
      schoolSearchLoading: studentSchoolSearchLoading,
      selectedSchool,
      teachers: studentTeachers,
      teachersLoading: studentTeachersLoading,
      selectedTeacher,
      selection: studentSelection,
      units: studentUnits,
      unitsLoading: studentUnitsLoading,
      items: studentItems,
      loading: studentLoading,
      status: studentStatus,
      error: studentError,
      updateSchoolQuery: updateStudentSchoolQuery,
      searchSchools: searchStudentSchools,
      chooseSchool: chooseStudentSchool,
      chooseTeacher: chooseStudentTeacher,
      updateSelection: updateStudentSelection,
      loadSet: loadStudentSet,
    },
  };
}
