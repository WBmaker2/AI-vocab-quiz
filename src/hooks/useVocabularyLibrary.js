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
  deleteTeacherAccountData,
  deleteTeacherVocabularySetsForGrade,
  deleteTeacherVocabularySet,
  fetchPublishedVocabularySet,
  fetchTeacherVocabularySet,
  findOrCreateSchool,
  getCurrentUser,
  getTeacherProfile,
  isFirebaseConfigured,
  listPublishedUnitsForTeacher,
  listPopularSchools,
  listTeacherSetCatalog,
  listTeachersForSchool,
  saveTeacherVocabularySet,
  searchSchoolsByName,
  signInWithGoogle,
  signOutCurrentUser,
  subscribeToAuthChanges,
  syncTeacherVocabularyMetadata,
  upsertTeacherProfile,
} from "../lib/firebase.js";
import { mergeVocabularyItems } from "../utils/vocabularyMerge.js";
import { parseVocabularyWorkbook } from "../utils/xlsxImport.js";

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
  const [studentSchoolBrowseMode, setStudentSchoolBrowseMode] =
    useState("featured");
  const [studentFeaturedSchools, setStudentFeaturedSchools] = useState([]);
  const [studentFeaturedSchoolsLoading, setStudentFeaturedSchoolsLoading] =
    useState(isFirebaseConfigured);
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
  const [studentMatchingUnits, setStudentMatchingUnits] = useState([]);
  const [studentMatchingItems, setStudentMatchingItems] = useState([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentStatus, setStudentStatus] = useState("");
  const [studentError, setStudentError] = useState("");

  const userId = session?.user?.uid ?? "";

  useEffect(() => {
    if (!isFirebaseConfigured) {
      return;
    }

    let cancelled = false;

    async function loadFeaturedSchools() {
      setStudentFeaturedSchoolsLoading(true);

      try {
        const schools = await listPopularSchools(5);
        if (!cancelled) {
          setStudentFeaturedSchools(schools);
        }
      } catch {
        if (!cancelled) {
          setStudentFeaturedSchools([]);
        }
      } finally {
        if (!cancelled) {
          setStudentFeaturedSchoolsLoading(false);
        }
      }
    }

    loadFeaturedSchools();

    return () => {
      cancelled = true;
    };
  }, []);

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
    if (!isFirebaseConfigured || !userId) {
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
  }, [onboarding.schoolName, userId]);

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

  function resetOnboardingToProfile() {
    setOnboarding((current) => ({
      ...current,
      schoolName: teacherProfile?.schoolName ?? "",
      teacherName: teacherProfile?.teacherName ?? "",
      suggestions: [],
      searching: false,
      saving: false,
      status: "",
      error: "",
    }));
  }

  async function saveTeacherOnboarding() {
    if (!isFirebaseConfigured) {
      setTeacherProfileError("Firebase 설정이 필요합니다.");
      return false;
    }

    const schoolName = onboarding.schoolName.trim();
    const teacherName = onboarding.teacherName.trim();

    if (!userId || !schoolName || !teacherName) {
      setOnboarding((current) => ({
        ...current,
        error: "학교 이름과 선생님 이름을 모두 입력하세요.",
      }));
      return false;
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
      await syncTeacherVocabularyMetadata({
        userId,
        teacherName,
        schoolId: school.id,
        schoolName: school.name,
      });
      await refreshStudentFeaturedSchools();

      const profile = await getTeacherProfile(userId);
      setTeacherProfile(profile);
      setOnboarding((current) => ({
        ...current,
        suggestions: [],
        saving: false,
        status: "선생님 정보를 저장했습니다.",
        error: "",
      }));
      return true;
    } catch (error) {
      setOnboarding((current) => ({
        ...current,
        saving: false,
        error: normalizeErrorMessage(
          error,
          "선생님 정보를 저장하지 못했습니다.",
        ),
      }));
      return false;
    }
  }

  async function deleteTeacherProfile(mode = "teacher") {
    if (!isFirebaseConfigured || !userId || !teacherProfile) {
      setTeacherError("삭제할 선생님 정보가 없습니다.");
      return false;
    }

    setOnboarding((current) => ({
      ...current,
      saving: true,
      error: "",
      status: "",
    }));
    setTeacherStatus("");
    setTeacherError("");

    const preservedTeacherName =
      mode === "school" ? teacherProfile.teacherName : "";

    try {
      await deleteTeacherAccountData(userId);

      setTeacherCatalog([]);
      setTeacherItems([]);
      setTeacherPublished(false);
      setTeacherDirty(false);
      setTeacherSelection(DEFAULT_TEACHER_SELECTION);
      setTeacherProfile(null);
      setOnboarding((current) => ({
        ...current,
        schoolName: "",
        teacherName: preservedTeacherName,
        suggestions: [],
        searching: false,
        saving: false,
        status:
          mode === "school"
            ? "학교 정보를 삭제했습니다. 학교 이름을 다시 등록하세요."
            : "선생님 정보를 삭제했습니다. 다시 등록할 수 있습니다.",
        error: "",
      }));

      await refreshStudentFeaturedSchools();
      return true;
    } catch (error) {
      setOnboarding((current) => ({
        ...current,
        saving: false,
        error: normalizeErrorMessage(
          error,
          "선생님 정보를 삭제하지 못했습니다.",
        ),
      }));
      return false;
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

  async function resetTeacherGradeSets() {
    if (!isFirebaseConfigured || !userId) {
      setTeacherError("Google 로그인 후 단어 세트를 초기화할 수 있습니다.");
      return;
    }

    if (!teacherSelection.grade) {
      setTeacherError("초기화할 학년을 먼저 선택하세요.");
      return;
    }

    setTeacherSaving(true);
    setTeacherStatus("");
    setTeacherError("");

    try {
      const deletedCount = await deleteTeacherVocabularySetsForGrade(
        userId,
        teacherSelection.grade,
      );

      setTeacherItems([]);
      setTeacherPublished(false);
      setTeacherDirty(false);

      setTeacherStatus(
        deletedCount > 0
          ? `${teacherSelection.grade}학년의 저장 단원 ${deletedCount}개를 초기화했습니다. 새 엑셀 파일을 다시 업로드할 수 있습니다.`
          : `${teacherSelection.grade}학년에 초기화할 저장 단원이 없습니다.`,
      );

      await refreshTeacherCatalog();
    } catch (error) {
      setTeacherError(
        normalizeErrorMessage(error, "학년 단어카드를 초기화하지 못했습니다."),
      );
    } finally {
      setTeacherSaving(false);
    }
  }

  async function importWorkbook(file, grade, publishOverride = null) {
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
      const publishImportedSets =
        publishOverride === null ? teacherPublished : publishOverride;
      let savedUnitCount = 0;
      let addedVocabularyCount = 0;
      let duplicateVocabularyCount = 0;
      const savedItemsByUnit = new Map();

      for (const groupedSet of groupedSets) {
        const existingSet = await fetchTeacherVocabularySet(userId, {
          grade,
          unit: groupedSet.unit,
        });
        const { mergedItems, addedCount, duplicateCount } = mergeVocabularyItems(
          existingSet.items ?? [],
          groupedSet.items,
        );
        const normalizedItems = normalizeDraftVocabulary(mergedItems);

        await saveTeacherVocabularySet({
          userId,
          schoolId: teacherProfile.schoolId,
          schoolName: teacherProfile.schoolName,
          teacherName: teacherProfile.teacherName,
          selection: { grade, unit: groupedSet.unit },
          items: normalizedItems,
          published: publishImportedSets,
          sourceType: "xlsx",
        });

        savedUnitCount += 1;
        addedVocabularyCount += addedCount;
        duplicateVocabularyCount += duplicateCount;
        savedItemsByUnit.set(groupedSet.unit, normalizedItems);
      }

      await refreshTeacherCatalog();

      const matchedSet = groupedSets.find(
        (groupedSet) =>
          groupedSet.unit === teacherSelection.unit &&
          teacherSelection.grade === grade,
      );

      if (matchedSet) {
        setTeacherItems(savedItemsByUnit.get(matchedSet.unit) ?? []);
        setTeacherPublished(publishImportedSets);
        setTeacherDirty(false);
      }

      setTeacherStatus(
        publishImportedSets
          ? `${grade}학년 엑셀 업로드를 완료했습니다. ${savedUnitCount}개 단원을 반영했고 새 단어 ${addedVocabularyCount}개를 추가했습니다. 중복 ${duplicateVocabularyCount}개는 건너뛰고 모든 반영 단원을 학생 공개로 설정했습니다.`
          : `${grade}학년 엑셀 업로드를 완료했습니다. ${savedUnitCount}개 단원을 반영했고 새 단어 ${addedVocabularyCount}개를 추가했습니다. 중복 ${duplicateVocabularyCount}개는 건너뛰었습니다.`,
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

  function updateStudentSchoolQuery(value) {
    setStudentSchoolQuery(value);
    if (!value.trim()) {
      setStudentSchoolBrowseMode("featured");
      setStudentSchoolResults([]);
      setSelectedSchool(null);
      setSelectedTeacher(null);
      setStudentTeachers([]);
      setStudentUnits([]);
      setStudentItems([]);
      resetStudentMatchingState();
      setStudentSelection(DEFAULT_STUDENT_SELECTION);
    }
    setStudentStatus("");
    setStudentError("");
  }

  async function refreshStudentFeaturedSchools() {
    if (!isFirebaseConfigured) {
      return;
    }

    try {
      const schools = await listPopularSchools(5);
      setStudentFeaturedSchools(schools);
    } catch {
      setStudentFeaturedSchools([]);
    }
  }

  function resetStudentMatchingState() {
    setStudentMatchingUnits([]);
    setStudentMatchingItems([]);
  }

  function seedStudentMatchingUnits(unit) {
    if (!unit) {
      return;
    }

    setStudentMatchingUnits([unit]);
    setStudentMatchingItems([]);
  }

  async function searchStudentSchools() {
    if (!isFirebaseConfigured) {
      setStudentError("Firebase 설정이 필요합니다.");
      return;
    }

    const query = studentSchoolQuery.trim();
    if (!query) {
      setStudentSchoolBrowseMode("featured");
      setStudentSchoolResults([]);
      setSelectedSchool(null);
      setSelectedTeacher(null);
      setStudentTeachers([]);
      setStudentUnits([]);
      setStudentItems([]);
      resetStudentMatchingState();
      setStudentSelection(DEFAULT_STUDENT_SELECTION);
      setStudentStatus("");
      setStudentError("");
      await refreshStudentFeaturedSchools();
      return;
    }

    setStudentSchoolSearchLoading(true);
    setStudentError("");
    setStudentStatus("");
    setStudentSchoolBrowseMode("search");

    try {
      const schools = await searchSchoolsByName(query);
      setStudentSchoolResults(schools);
      setSelectedSchool(null);
      setSelectedTeacher(null);
      setStudentTeachers([]);
      setStudentUnits([]);
      setStudentItems([]);
      resetStudentMatchingState();
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
    resetStudentMatchingState();
    setStudentSelection(DEFAULT_STUDENT_SELECTION);
    setStudentTeachersLoading(true);
    setStudentStatus("");
    setStudentError("");

    try {
      const teachers = await listTeachersForSchool(school.id);
      setStudentTeachers(teachers);

      if (teachers.length === 1) {
        const onlyTeacher = teachers[0];
        setSelectedTeacher(onlyTeacher);
        await refreshStudentUnits(onlyTeacher, DEFAULT_STUDENT_SELECTION.grade);
        setStudentStatus(
          `${school.name}의 선생님 ${onlyTeacher.teacherName}님을 자동 선택했습니다.`,
        );
        return;
      }

      setStudentStatus(
        teachers.length > 1
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
    resetStudentMatchingState();
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
      resetStudentMatchingState();
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
      setStudentMatchingUnits(items.length > 0 ? [studentSelection.unit] : []);
      setStudentMatchingItems([]);
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

  function toggleStudentMatchingUnit(unit) {
    setStudentMatchingUnits((current) => {
      const hasUnit = current.includes(unit);
      const nextUnits = hasUnit
        ? current.filter((entry) => entry !== unit)
        : [...current, unit];

      return nextUnits.sort((left, right) =>
        String(left).localeCompare(String(right), undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );
    });
    setStudentMatchingItems([]);
    setStudentStatus("");
    setStudentError("");
  }

  async function loadStudentMatchingSet() {
    if (!isFirebaseConfigured) {
      setStudentError("Firebase 설정이 필요합니다.");
      return false;
    }

    if (!selectedSchool || !selectedTeacher || studentMatchingUnits.length === 0) {
      setStudentError("학교, 선생님, 학년을 고르고 게임용 단원을 한 개 이상 체크하세요.");
      return false;
    }

    setStudentLoading(true);
    setStudentStatus("");
    setStudentError("");

    try {
      const unitItems = await Promise.all(
        studentMatchingUnits.map((unit) =>
          fetchPublishedVocabularySet({
            teacherUserId: selectedTeacher.userId,
            grade: studentSelection.grade,
            unit,
          }),
        ),
      );

      const combinedItems = Array.from(
        new Map(
          unitItems
            .flat()
            .filter(
              (item) =>
                String(item.word ?? "").trim() &&
                String(item.meaning ?? "").trim(),
            )
            .map((item) => [`${item.word}__${item.meaning}`, item]),
        ).values(),
      );

      setStudentMatchingItems(combinedItems);
      setStudentStatus(
        combinedItems.length > 0
          ? `${selectedTeacher.teacherName} 선생님의 ${studentSelection.grade}학년 ${studentMatchingUnits.length}개 단원에서 ${combinedItems.length}개 단어를 준비했습니다.`
          : "선택한 단원들에 공개된 단어가 없습니다.",
      );

      return combinedItems.length > 0;
    } catch (error) {
      setStudentError(
        normalizeErrorMessage(
          error,
          "짝 맞추기용 단어 세트를 불러오지 못했습니다.",
        ),
      );
      return false;
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
        resetToProfile: resetOnboardingToProfile,
        save: saveTeacherOnboarding,
        deleteTeacher: () => deleteTeacherProfile("teacher"),
        deleteSchool: () => deleteTeacherProfile("school"),
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
      resetGradeSets: resetTeacherGradeSets,
      importWorkbook,
      addItem: addTeacherItem,
      updateItem: updateTeacherItem,
      removeItem: removeTeacherItem,
      clearItems: clearTeacherItems,
    },
    student: {
      schoolQuery: studentSchoolQuery,
      schoolBrowseMode: studentSchoolBrowseMode,
      featuredSchools: studentFeaturedSchools,
      featuredSchoolsLoading: studentFeaturedSchoolsLoading,
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
      matchingUnits: studentMatchingUnits,
      matchingItems: studentMatchingItems,
      loading: studentLoading,
      status: studentStatus,
      error: studentError,
      updateSchoolQuery: updateStudentSchoolQuery,
      searchSchools: searchStudentSchools,
      chooseSchool: chooseStudentSchool,
      chooseTeacher: chooseStudentTeacher,
      updateSelection: updateStudentSelection,
      loadSet: loadStudentSet,
      toggleMatchingUnit: toggleStudentMatchingUnit,
      seedMatchingUnits: seedStudentMatchingUnits,
      loadMatchingSet: loadStudentMatchingSet,
    },
  };
}
