import { useEffect, useState } from "react";
import {
  DEFAULT_STUDENT_SELECTION,
  GRADE_OPTIONS,
  formatSetLabel,
} from "../../constants/vocabulary.js";
import {
  fetchPublishedVocabularySet,
  isFirebaseConfigured,
  listPopularSchools,
  listPublishedUnitsForTeacher,
  listTeachersForSchool,
  searchSchoolsByName,
} from "../../lib/firebase.js";
import {
  buildStudentContexts,
  buildStudentMatchingItems,
  toggleStudentMatchingUnits,
} from "../../utils/studentSetLoader.js";
import {
  readStudentRecentSelection,
  resolveStudentRecentSelection,
  upsertStudentRecentSelection,
} from "../../utils/studentRecentSelection.js";

const STUDENT_RECENT_SELECTION_STORAGE_KEY = "studentRecentSelections.v1";
const STUDENT_GRADE_VALUES = GRADE_OPTIONS.map((option) => option.value);

function getStudentUnitsStatusMessage(grade, nextUnits) {
  return nextUnits.length > 0
    ? `${grade}학년에서 공개된 ${nextUnits.length}개 단원을 찾았습니다.`
    : "선택한 학년에서 공개된 단원이 아직 없습니다.";
}

function buildRecentSelectionStatus({
  school,
  teacher,
  recentSelection,
  resolvedSelection,
  autoTeacherSelected,
}) {
  const teacherName = String(teacher?.teacherName ?? "").trim();
  const schoolName = String(school?.name ?? "").trim();

  if (!teacherName) {
    return "";
  }

  if (
    recentSelection &&
    resolvedSelection.grade === recentSelection.grade &&
    resolvedSelection.unit === recentSelection.unit &&
    resolvedSelection.unit
  ) {
    return autoTeacherSelected
      ? `${schoolName}의 선생님 ${teacherName}님을 자동 선택했고 최근 학습한 ${formatSetLabel(resolvedSelection)}을 불러왔습니다.`
      : `${teacherName} 선생님의 최근 학습한 ${formatSetLabel(resolvedSelection)}을 불러왔습니다.`;
  }

  if (
    recentSelection &&
    resolvedSelection.grade === recentSelection.grade &&
    !resolvedSelection.unit
  ) {
    return autoTeacherSelected
      ? `${schoolName}의 선생님 ${teacherName}님을 자동 선택했고 최근 학습한 ${resolvedSelection.grade}학년을 불러왔습니다. 단원은 다시 선택해 주세요.`
      : `${teacherName} 선생님의 최근 학습한 ${resolvedSelection.grade}학년을 불러왔습니다. 단원은 다시 선택해 주세요.`;
  }

  if (autoTeacherSelected && schoolName) {
    return `${schoolName}의 선생님 ${teacherName}님을 자동 선택했습니다.`;
  }

  return "";
}

export function useStudentSetLoader({ formatErrorMessage }) {
  const [schoolQuery, setSchoolQuery] = useState("");
  const [schoolBrowseMode, setSchoolBrowseMode] = useState("featured");
  const [featuredSchools, setFeaturedSchools] = useState([]);
  const [featuredSchoolsLoading, setFeaturedSchoolsLoading] =
    useState(isFirebaseConfigured);
  const [schoolResults, setSchoolResults] = useState([]);
  const [schoolSearchLoading, setSchoolSearchLoading] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selection, setSelection] = useState(DEFAULT_STUDENT_SELECTION);
  const [units, setUnits] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [matchingUnits, setMatchingUnits] = useState([]);
  const [matchingItems, setMatchingItems] = useState([]);
  const [nameDraft, setNameDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  function readRecentSelectionFromStorage(schoolId, teacherUserId) {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      return readStudentRecentSelection(
        window.localStorage.getItem(STUDENT_RECENT_SELECTION_STORAGE_KEY),
        { schoolId, teacherUserId },
      );
    } catch {
      return null;
    }
  }

  function writeRecentSelectionToStorage({ schoolId, teacherUserId, grade, unit }) {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const nextValue = upsertStudentRecentSelection(
        window.localStorage.getItem(STUDENT_RECENT_SELECTION_STORAGE_KEY),
        {
          schoolId,
          teacherUserId,
          grade,
          unit,
        },
      );
      window.localStorage.setItem(
        STUDENT_RECENT_SELECTION_STORAGE_KEY,
        nextValue,
      );
    } catch {
      // localStorage 접근 실패는 학생 선택 흐름을 막지 않습니다.
    }
  }

  useEffect(() => {
    if (!isFirebaseConfigured) {
      return;
    }

    let cancelled = false;

    async function loadFeaturedSchools() {
      setFeaturedSchoolsLoading(true);

      try {
        const schools = await listPopularSchools(5);
        if (!cancelled) {
          setFeaturedSchools(schools);
        }
      } catch {
        if (!cancelled) {
          setFeaturedSchools([]);
        }
      } finally {
        if (!cancelled) {
          setFeaturedSchoolsLoading(false);
        }
      }
    }

    loadFeaturedSchools();

    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshFeaturedSchools() {
    if (!isFirebaseConfigured) {
      return;
    }

    try {
      const schools = await listPopularSchools(5);
      setFeaturedSchools(schools);
    } catch {
      setFeaturedSchools([]);
    }
  }

  function resetMatchingState() {
    setMatchingUnits([]);
    setMatchingItems([]);
  }

  function resetSelectedFlow() {
    setSelectedSchool(null);
    setSelectedTeacher(null);
    setNameDraft("");
    setTeachers([]);
    setUnits([]);
    setItems([]);
    resetMatchingState();
    setSelection(DEFAULT_STUDENT_SELECTION);
  }

  function seedMatchingUnits(unit) {
    if (!unit) {
      return;
    }

    setMatchingUnits([unit]);
    setMatchingItems([]);
  }

  function updateSchoolQuery(value) {
    setSchoolQuery(value);
    if (!value.trim()) {
      setSchoolBrowseMode("featured");
      setSchoolResults([]);
      resetSelectedFlow();
    }
    setStatus("");
    setError("");
  }

  async function searchSchools() {
    if (!isFirebaseConfigured) {
      setError("Firebase 설정이 필요합니다.");
      return;
    }

    const query = schoolQuery.trim();
    if (!query) {
      setSchoolBrowseMode("featured");
      setSchoolResults([]);
      resetSelectedFlow();
      setStatus("");
      setError("");
      await refreshFeaturedSchools();
      return;
    }

    setSchoolSearchLoading(true);
    setError("");
    setStatus("");
    setSchoolBrowseMode("search");

    try {
      const schools = await searchSchoolsByName(query);
      setSchoolResults(schools);
      resetSelectedFlow();
      setStatus(
        schools.length > 0
          ? `${schools.length}개의 학교를 찾았습니다.`
          : "검색 결과가 없습니다. 학교 이름을 다시 확인하세요.",
      );
    } catch (nextError) {
      setError(
        formatErrorMessage(nextError, "학교 목록을 불러오지 못했습니다."),
      );
    } finally {
      setSchoolSearchLoading(false);
    }
  }

  async function refreshUnits(
    nextTeacher = selectedTeacher,
    nextGrade,
    { suppressStatus = false } = {},
  ) {
    if (!isFirebaseConfigured || !nextTeacher?.userId) {
      setUnits([]);
      return [];
    }

    setUnitsLoading(true);
    setError("");
    if (!suppressStatus) {
      setStatus("");
    }

    try {
      const nextUnits = await listPublishedUnitsForTeacher(
        nextTeacher.userId,
        nextGrade,
      );
      setUnits(nextUnits);
      if (!suppressStatus) {
        setStatus(getStudentUnitsStatusMessage(nextGrade, nextUnits));
      }
      return nextUnits;
    } catch (nextError) {
      setError(
        formatErrorMessage(nextError, "공개 단원 목록을 불러오지 못했습니다."),
      );
      return [];
    } finally {
      setUnitsLoading(false);
    }
  }

  async function restoreSelectionForTeacher({
    school,
    teacher,
    autoTeacherSelected = false,
  }) {
    const recentSelection = readRecentSelectionFromStorage(
      school?.id,
      teacher?.userId,
    );
    const seededSelection = resolveStudentRecentSelection({
      defaultSelection: DEFAULT_STUDENT_SELECTION,
      recentSelection,
      availableGrades: STUDENT_GRADE_VALUES,
      availableUnits: [],
    });

    setSelection(seededSelection);

    const nextUnits = await refreshUnits(teacher, seededSelection.grade, {
      suppressStatus: true,
    });
    const resolvedSelection = resolveStudentRecentSelection({
      defaultSelection: DEFAULT_STUDENT_SELECTION,
      recentSelection,
      availableGrades: STUDENT_GRADE_VALUES,
      availableUnits: nextUnits,
    });

    setSelection(resolvedSelection);

    return (
      buildRecentSelectionStatus({
        school,
        teacher,
        recentSelection,
        resolvedSelection,
        autoTeacherSelected,
      }) || getStudentUnitsStatusMessage(resolvedSelection.grade, nextUnits)
    );
  }

  async function chooseSchool(school) {
    if (!isFirebaseConfigured) {
      return;
    }

    setSelectedSchool(school);
    setSelectedTeacher(null);
    setNameDraft("");
    setTeachers([]);
    setUnits([]);
    setItems([]);
    resetMatchingState();
    setSelection(DEFAULT_STUDENT_SELECTION);
    setTeachersLoading(true);
    setStatus("");
    setError("");

    try {
      const nextTeachers = await listTeachersForSchool(school.id);
      setTeachers(nextTeachers);

      if (nextTeachers.length === 1) {
        const onlyTeacher = nextTeachers[0];
        setSelectedTeacher(onlyTeacher);
        const nextStatus = await restoreSelectionForTeacher({
          school,
          teacher: onlyTeacher,
          autoTeacherSelected: true,
        });
        setStatus(nextStatus);
        return;
      }

      setStatus(
        nextTeachers.length > 1
          ? `${school.name}의 선생님 목록을 불러왔습니다.`
          : "이 학교에 등록된 선생님 정보가 아직 없습니다.",
      );
    } catch (nextError) {
      setError(
        formatErrorMessage(nextError, "선생님 목록을 불러오지 못했습니다."),
      );
    } finally {
      setTeachersLoading(false);
    }
  }

  async function chooseTeacher(teacherUserId) {
    const teacher = teachers.find((entry) => entry.userId === teacherUserId);
    setSelectedTeacher(teacher ?? null);
    setNameDraft("");
    setItems([]);
    resetMatchingState();
    setUnits([]);
    setSelection(DEFAULT_STUDENT_SELECTION);
    setStatus("");
    setError("");

    if (teacher && selectedSchool) {
      const nextStatus = await restoreSelectionForTeacher({
        school: selectedSchool,
        teacher,
      });
      setStatus(nextStatus);
    }
  }

  async function updateSelection(field, value) {
    setItems([]);
    setError("");
    setStatus("");

    if (field === "grade") {
      setNameDraft("");
      setSelection((current) => ({
        ...current,
        grade: value,
        unit: "",
      }));
      setUnits([]);
      resetMatchingState();
      if (selectedTeacher) {
        await refreshUnits(selectedTeacher, value);
      }
      return;
    }

    setSelection((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function loadSet() {
    if (!isFirebaseConfigured) {
      setError("Firebase 설정이 필요합니다.");
      return;
    }

    if (!selectedSchool || !selectedTeacher || !selection.unit) {
      setError("학교, 선생님, 학년, 단원을 모두 선택하세요.");
      return;
    }

    setLoading(true);
    setStatus("");
    setError("");

    try {
      const nextItems = await fetchPublishedVocabularySet({
        teacherUserId: selectedTeacher.userId,
        grade: selection.grade,
        unit: selection.unit,
      });
      setItems(nextItems);
      setMatchingUnits(nextItems.length > 0 ? [selection.unit] : []);
      setMatchingItems([]);
      setStatus(
        nextItems.length > 0
          ? `${selectedTeacher.teacherName} 선생님의 ${formatSetLabel(selection)} 세트를 불러왔습니다.`
          : "선택한 조건에 공개된 단어가 없습니다.",
      );
      if (nextItems.length > 0) {
        writeRecentSelectionToStorage({
          schoolId: selectedSchool.id,
          teacherUserId: selectedTeacher.userId,
          grade: selection.grade,
          unit: selection.unit,
        });
      }
    } catch (nextError) {
      setError(
        formatErrorMessage(nextError, "학생용 단어 세트를 불러오지 못했습니다."),
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleMatchingUnit(unit) {
    setMatchingUnits((current) => toggleStudentMatchingUnits(current, unit));
    setMatchingItems([]);
    setStatus("");
    setError("");
  }

  async function loadMatchingSet() {
    if (!isFirebaseConfigured) {
      setError("Firebase 설정이 필요합니다.");
      return false;
    }

    if (!selectedSchool || !selectedTeacher || matchingUnits.length === 0) {
      setError("학교, 선생님, 학년을 고르고 게임용 단원을 한 개 이상 체크하세요.");
      return false;
    }

    setLoading(true);
    setStatus("");
    setError("");

    try {
      const unitItems = await Promise.all(
        matchingUnits.map((unit) =>
          fetchPublishedVocabularySet({
            teacherUserId: selectedTeacher.userId,
            grade: selection.grade,
            unit,
          }),
        ),
      );

      const combinedItems = buildStudentMatchingItems(unitItems);

      setMatchingItems(combinedItems);
      setStatus(
        combinedItems.length > 0
          ? `${selectedTeacher.teacherName} 선생님의 ${selection.grade}학년 ${matchingUnits.length}개 단원에서 ${combinedItems.length}개 단어를 준비했습니다.`
          : "선택한 단원들에 공개된 단어가 없습니다.",
      );

      return combinedItems.length > 0;
    } catch (nextError) {
      setError(
        formatErrorMessage(
          nextError,
          "짝 맞추기용 단어 세트를 불러오지 못했습니다.",
        ),
      );
      return false;
    } finally {
      setLoading(false);
    }
  }

  const contexts = buildStudentContexts({
    selectedSchool,
    selectedTeacher,
    selection,
  });

  return {
    schoolQuery,
    schoolBrowseMode,
    featuredSchools,
    featuredSchoolsLoading,
    schoolResults,
    schoolSearchLoading,
    selectedSchool,
    teachers,
    teachersLoading,
    selectedTeacher,
    selection,
    leaderboardContext: contexts.leaderboardContext,
    units,
    unitsLoading,
    items,
    matchingUnits,
    matchingItems,
    nameDraft,
    loading,
    status,
    error,
    progressionContext: contexts.progressionContext,
    refreshFeaturedSchools,
    updateSchoolQuery,
    searchSchools,
    chooseSchool,
    chooseTeacher,
    updateSelection,
    updateNameDraft: setNameDraft,
    loadSet,
    toggleMatchingUnit,
    seedMatchingUnits,
    loadMatchingSet,
  };
}
