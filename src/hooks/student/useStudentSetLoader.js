import { useEffect, useState } from "react";
import {
  DEFAULT_STUDENT_SELECTION,
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

  async function refreshUnits(nextTeacher = selectedTeacher, nextGrade) {
    if (!isFirebaseConfigured || !nextTeacher?.userId) {
      setUnits([]);
      return;
    }

    setUnitsLoading(true);
    setError("");
    setStatus("");

    try {
      const nextUnits = await listPublishedUnitsForTeacher(
        nextTeacher.userId,
        nextGrade,
      );
      setUnits(nextUnits);
      setStatus(
        nextUnits.length > 0
          ? `${nextGrade}학년에서 공개된 ${nextUnits.length}개 단원을 찾았습니다.`
          : "선택한 학년에서 공개된 단원이 아직 없습니다.",
      );
    } catch (nextError) {
      setError(
        formatErrorMessage(nextError, "공개 단원 목록을 불러오지 못했습니다."),
      );
    } finally {
      setUnitsLoading(false);
    }
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
        await refreshUnits(onlyTeacher, DEFAULT_STUDENT_SELECTION.grade);
        setStatus(
          `${school.name}의 선생님 ${onlyTeacher.teacherName}님을 자동 선택했습니다.`,
        );
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
    setSelection((current) => ({
      ...current,
      unit: "",
    }));

    if (teacher) {
      await refreshUnits(teacher, selection.grade);
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
