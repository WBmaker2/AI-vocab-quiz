import { useEffect, useMemo, useRef, useState } from "react";
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
  deleteTeacherActivityLeaderboardStudent,
  fetchPublishedPublisherSourceUnits,
  fetchPublishedVocabularySet,
  fetchTeacherActivityLeaderboards,
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
  renameTeacherActivityLeaderboardStudent,
  searchPublishedPublisherSources,
  searchSchoolsByName,
  signInWithGoogle,
  signOutCurrentUser,
  subscribeToAuthChanges,
  syncTeacherVocabularyMetadata,
  upsertTeacherProfile,
} from "../lib/firebase.js";
import {
  groupPublisherSourcesByTeacherAndSchool,
  summarizePublisherCopyResult,
} from "../utils/publisherCopy.js";
import { getActivityLeaderboardDefinition } from "../utils/activityLeaderboard.js";
import { determineBingoBoardSize } from "../utils/bingo.js";
import { LEADERBOARD_PERIOD_DEFINITIONS } from "../utils/leaderboard.js";
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

function summarizeTeacherLeaderboardOutcome(periods, kind) {
  if (!periods || periods.length === 0) {
    return "";
  }

  const periodLabelMap = {
    week: "주간",
    month: "월간",
    year: "연간",
    school_all: "학교 전체",
  };
  const labels = periods.map((period) => periodLabelMap[period] ?? period);

  if (labels.length === 1) {
    return `${labels[0]} ${kind}`;
  }

  return `${labels.join(", ")} ${kind}`;
}

function clearTeacherAutoSaveTimer(timerRef) {
  if (timerRef.current) {
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}

function buildTeacherBingoItemsFromCatalog(catalog, grade, selectedUnits) {
  const cleanGrade = String(grade ?? "").trim();
  const cleanSelectedUnits = Array.from(
    new Set(
      (Array.isArray(selectedUnits) ? selectedUnits : [])
        .map((unit) => String(unit ?? "").trim())
        .filter(Boolean),
    ),
  );

  if (!cleanGrade || cleanSelectedUnits.length === 0) {
    return [];
  }

  const selectedEntries = cleanSelectedUnits
    .map((unit) =>
      (Array.isArray(catalog) ? catalog : []).find(
        (entry) =>
          String(entry.grade ?? "").trim() === cleanGrade &&
          String(entry.unit ?? "").trim() === unit,
      ),
    )
    .filter(Boolean);

  const mergedItems = selectedEntries.reduce(
    (items, entry) => mergeVocabularyItems(items, entry.items ?? []).mergedItems,
    [],
  );

  return normalizeDraftVocabulary(mergedItems);
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
  const [teacherPublisherDraft, setTeacherPublisherDraft] = useState("");
  const [teacherItems, setTeacherItems] = useState([]);
  const [teacherPublished, setTeacherPublished] = useState(false);
  const [teacherDirty, setTeacherDirty] = useState(false);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teacherSaving, setTeacherSaving] = useState(false);
  const [teacherImporting, setTeacherImporting] = useState(false);
  const [teacherStatus, setTeacherStatus] = useState("");
  const [teacherError, setTeacherError] = useState("");
  const [teacherCopySources, setTeacherCopySources] = useState([]);
  const [teacherSelectedCopySourceId, setTeacherSelectedCopySourceId] =
    useState("");
  const [teacherCopyLoading, setTeacherCopyLoading] = useState(false);
  const [teacherCopying, setTeacherCopying] = useState(false);
  const [teacherCopyStatus, setTeacherCopyStatus] = useState("");
  const [teacherCopyError, setTeacherCopyError] = useState("");
  const [teacherLeaderboards, setTeacherLeaderboards] = useState({});
  const [teacherLeaderboardLoading, setTeacherLeaderboardLoading] =
    useState(false);
  const [teacherLeaderboardError, setTeacherLeaderboardError] = useState("");
  const [teacherLeaderboardStatus, setTeacherLeaderboardStatus] = useState("");
  const [teacherLeaderboardTab, setTeacherLeaderboardTab] = useState("week");
  const [teacherLeaderboardActivityType, setTeacherLeaderboardActivityType] =
    useState("matching");
  const [teacherLeaderboardEditingName, setTeacherLeaderboardEditingName] =
    useState("");
  const [teacherLeaderboardDraftName, setTeacherLeaderboardDraftName] =
    useState("");
  const [teacherLeaderboardSaving, setTeacherLeaderboardSaving] =
    useState(false);
  const [teacherBingoUnits, setTeacherBingoUnits] = useState([]);
  const [teacherAutoSaveStatus, setTeacherAutoSaveStatus] = useState("");
  const [teacherAutoSaveToken, setTeacherAutoSaveToken] = useState(0);

  const teacherAutoSaveTimerRef = useRef(null);
  const teacherAutoSaveSnapshotRef = useRef(null);

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
  const [studentNameDraft, setStudentNameDraft] = useState("");
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentStatus, setStudentStatus] = useState("");
  const [studentError, setStudentError] = useState("");

  const userId = session?.user?.uid ?? "";

  useEffect(() => {
    teacherAutoSaveSnapshotRef.current = {
      userId,
      profile: teacherProfile,
      selection: teacherSelection,
      publisher: teacherPublisherDraft,
      published: teacherPublished,
      items: teacherItems,
      dirty: teacherDirty,
      loading: teacherLoading,
      saving: teacherSaving,
      importing: teacherImporting,
      copying: teacherCopying,
    };
  }, [
    userId,
    teacherProfile,
    teacherSelection,
    teacherPublisherDraft,
    teacherPublished,
    teacherItems,
    teacherDirty,
    teacherLoading,
    teacherSaving,
    teacherImporting,
    teacherCopying,
  ]);

  useEffect(() => {
    if (!teacherAutoSaveToken) {
      return;
    }

    if (!teacherDirty) {
      clearTeacherAutoSaveTimer(teacherAutoSaveTimerRef);
      setTeacherAutoSaveToken(0);
      setTeacherAutoSaveStatus("");
      return;
    }

    queueTeacherAutoSave();
  }, [teacherAutoSaveToken]);

  useEffect(
    () => () => {
      clearTeacherAutoSaveTimer(teacherAutoSaveTimerRef);
    },
    [],
  );

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
      clearTeacherAutoSaveTimer(teacherAutoSaveTimerRef);
      setTeacherAutoSaveToken(0);
      setTeacherProfile(null);
      setTeacherProfileError("");
      setTeacherCatalog([]);
      setTeacherItems([]);
      setTeacherPublished(false);
      setTeacherPublisherDraft("");
      setTeacherDirty(false);
      setTeacherStatus("");
      setTeacherAutoSaveStatus("");
      setTeacherError("");
      setTeacherCopySources([]);
      setTeacherSelectedCopySourceId("");
      setTeacherCopyStatus("");
      setTeacherCopyError("");
      setTeacherLeaderboards({});
      setTeacherLeaderboardLoading(false);
      setTeacherLeaderboardError("");
      setTeacherLeaderboardStatus("");
      setTeacherLeaderboardTab("week");
      setTeacherLeaderboardEditingName("");
      setTeacherLeaderboardDraftName("");
      setTeacherLeaderboardSaving(false);
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
    if (!isFirebaseConfigured || !teacherProfile?.schoolId || !teacherSelection.grade) {
      setTeacherLeaderboards({});
      setTeacherLeaderboardLoading(false);
      setTeacherLeaderboardError("");
      setTeacherLeaderboardStatus("");
      setTeacherLeaderboardEditingName("");
      setTeacherLeaderboardDraftName("");
      return;
    }

    let cancelled = false;

    async function loadTeacherLeaderboards() {
      setTeacherLeaderboardLoading(true);
      setTeacherLeaderboardError("");
      setTeacherLeaderboardStatus("");

      try {
        const boards = await fetchTeacherActivityLeaderboards({
          activityType: teacherLeaderboardActivityType,
          schoolId: teacherProfile.schoolId,
          grade: teacherSelection.grade,
          limitCount: 20,
        });

        if (!cancelled) {
          setTeacherLeaderboards(boards);
          setTeacherLeaderboardTab((current) =>
            boards[current] ? current : Object.keys(boards)[0] ?? "week",
          );
          setTeacherLeaderboardEditingName("");
          setTeacherLeaderboardDraftName("");
        }
      } catch (error) {
        if (!cancelled) {
          setTeacherLeaderboards({});
          setTeacherLeaderboardError(
            normalizeErrorMessage(error, "리더보드를 불러오지 못했습니다."),
          );
        }
      } finally {
        if (!cancelled) {
          setTeacherLeaderboardLoading(false);
        }
      }
    }

    loadTeacherLeaderboards();

    return () => {
      cancelled = true;
    };
  }, [
    teacherLeaderboardActivityType,
    teacherProfile?.schoolId,
    teacherSelection.grade,
  ]);

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
        gradePublishers: teacherProfile?.gradePublishers ?? {},
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
      setTeacherAutoSaveToken(0);
      clearTeacherAutoSaveTimer(teacherAutoSaveTimerRef);
      setTeacherAutoSaveStatus("");
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
    setTeacherSelection((current) => {
      if (field === "grade") {
        const nextGrade = String(value ?? "").trim();
        const nextUnits = getUnitsForGrade(teacherCatalog, nextGrade);
        return {
          ...current,
          grade: nextGrade,
          unit: nextUnits[0] ?? "",
        };
      }

      return {
        ...current,
        [field]: value,
      };
    });
    clearTeacherAutoSaveTimer(teacherAutoSaveTimerRef);
    setTeacherAutoSaveToken(0);
    setTeacherAutoSaveStatus("");
    setTeacherStatus("");
    setTeacherError("");
    setTeacherCopyStatus("");
    setTeacherCopyError("");
    setTeacherCopySources([]);
    setTeacherSelectedCopySourceId("");
  }

  function updateTeacherPublisher(value) {
    setTeacherPublisherDraft(value);
    clearTeacherAutoSaveTimer(teacherAutoSaveTimerRef);
    setTeacherAutoSaveToken(0);
    setTeacherAutoSaveStatus("");
    setTeacherStatus("");
    setTeacherError("");
    setTeacherCopyStatus("");
    setTeacherCopyError("");
    setTeacherCopySources([]);
    setTeacherSelectedCopySourceId("");
  }


  function updateTeacherLeaderboardActivityType(nextType) {
    setTeacherLeaderboardActivityType(nextType);
    setTeacherLeaderboardStatus("");
    setTeacherLeaderboardError("");
    setTeacherLeaderboardEditingName("");
    setTeacherLeaderboardDraftName("");
  }

  function refreshTeacherLeaderboards() {
    if (!teacherProfile?.schoolId || !teacherSelection.grade) {
      setTeacherLeaderboards({});
      return Promise.resolve();
    }

    setTeacherLeaderboardLoading(true);
    setTeacherLeaderboardError("");
    setTeacherLeaderboardStatus("");

    return fetchTeacherActivityLeaderboards({
      activityType: teacherLeaderboardActivityType,
      schoolId: teacherProfile.schoolId,
      grade: teacherSelection.grade,
      limitCount: 20,
    })
      .then((boards) => {
        setTeacherLeaderboards(boards);
        setTeacherLeaderboardTab((current) =>
          boards[current] ? current : Object.keys(boards)[0] ?? "week",
        );
      })
      .catch((error) => {
        setTeacherLeaderboardError(
          normalizeErrorMessage(error, "리더보드를 불러오지 못했습니다."),
        );
      })
      .finally(() => {
        setTeacherLeaderboardLoading(false);
      });
  }

  function startTeacherLeaderboardEdit(studentName) {
    const cleanName = String(studentName ?? "").trim();
    if (!cleanName) {
      return;
    }

    setTeacherLeaderboardEditingName(cleanName);
    setTeacherLeaderboardDraftName(cleanName);
    setTeacherLeaderboardStatus("");
    setTeacherLeaderboardError("");
  }

  function cancelTeacherLeaderboardEdit() {
    setTeacherLeaderboardEditingName("");
    setTeacherLeaderboardDraftName("");
  }

  async function renameTeacherLeaderboardStudent(oldName, newName) {
    if (!teacherProfile?.schoolId || !teacherSelection.grade) {
      setTeacherLeaderboardError("학교와 학년 정보를 확인한 뒤 다시 시도해 주세요.");
      return false;
    }

    const cleanOldName = String(oldName ?? "").trim().replace(/\s+/g, " ");
    const cleanNewName = String(newName ?? "").trim().replace(/\s+/g, " ");

    if (!cleanOldName || !cleanNewName) {
      setTeacherLeaderboardError("학생 이름을 입력해 주세요.");
      return false;
    }

    if (cleanOldName === cleanNewName) {
      setTeacherLeaderboardError("같은 이름으로는 수정할 수 없습니다.");
      return false;
    }

    const activityDefinition = getActivityLeaderboardDefinition(
      teacherLeaderboardActivityType,
    );

    if (
      !window.confirm(
        `'${cleanOldName}' 이름을 '${cleanNewName}'(으)로 현재 ${activityDefinition.label} 리더보드의 주/월/연/우리학교 전체 기록에서 모두 수정할까요?`,
      )
    ) {
      return false;
    }

    setTeacherLeaderboardSaving(true);
    setTeacherLeaderboardError("");
    setTeacherLeaderboardStatus("");

    try {
      const result = await renameTeacherActivityLeaderboardStudent({
        activityType: teacherLeaderboardActivityType,
        schoolId: teacherProfile.schoolId,
        grade: teacherSelection.grade,
        oldStudentName: cleanOldName,
        newStudentName: cleanNewName,
      });

      const updatedLabel = summarizeTeacherLeaderboardOutcome(
        result.updatedPeriods,
        "수정",
      );
      const keptLabel = summarizeTeacherLeaderboardOutcome(
        result.keptPeriods,
        "유지",
      );
      const skippedLabel = summarizeTeacherLeaderboardOutcome(
        result.skippedPeriods,
        "없음",
      );

      cancelTeacherLeaderboardEdit();
      await refreshTeacherLeaderboards();

      setTeacherLeaderboardStatus(
        [updatedLabel, keptLabel, skippedLabel].filter(Boolean).join(" · ") ||
          `${activityDefinition.label} 리더보드 학생 이름을 수정했습니다.`,
      );
      return true;
    } catch (error) {
      setTeacherLeaderboardError(
        normalizeErrorMessage(error, "학생 이름을 수정하지 못했습니다."),
      );
      return false;
    } finally {
      setTeacherLeaderboardSaving(false);
    }
  }

  async function deleteTeacherLeaderboardStudent(studentName) {
    if (!teacherProfile?.schoolId || !teacherSelection.grade) {
      setTeacherLeaderboardError("학교와 학년 정보를 확인한 뒤 다시 시도해 주세요.");
      return false;
    }

    const cleanStudentName = String(studentName ?? "").trim().replace(/\s+/g, " ");
    if (!cleanStudentName) {
      setTeacherLeaderboardError("삭제할 학생 이름이 없습니다.");
      return false;
    }

    const activityDefinition = getActivityLeaderboardDefinition(
      teacherLeaderboardActivityType,
    );

    if (
      !window.confirm(
        `'${cleanStudentName}' 학생 기록을 현재 ${activityDefinition.label} 리더보드의 주/월/연/우리학교 전체 기록에서 모두 삭제할까요?`,
      )
    ) {
      return false;
    }

    setTeacherLeaderboardSaving(true);
    setTeacherLeaderboardError("");
    setTeacherLeaderboardStatus("");

    try {
      const result = await deleteTeacherActivityLeaderboardStudent({
        activityType: teacherLeaderboardActivityType,
        schoolId: teacherProfile.schoolId,
        grade: teacherSelection.grade,
        studentName: cleanStudentName,
      });

      const deletedLabel = summarizeTeacherLeaderboardOutcome(
        result.deletedPeriods,
        "삭제",
      );
      const skippedLabel = summarizeTeacherLeaderboardOutcome(
        result.skippedPeriods,
        "없음",
      );

      if (teacherLeaderboardEditingName === cleanStudentName) {
        cancelTeacherLeaderboardEdit();
      }

      await refreshTeacherLeaderboards();
      setTeacherLeaderboardStatus(
        [deletedLabel, skippedLabel].filter(Boolean).join(" · ") ||
          `${activityDefinition.label} 리더보드 학생 기록을 삭제했습니다.`,
      );
      return true;
    } catch (error) {
      setTeacherLeaderboardError(
        normalizeErrorMessage(error, "학생 기록을 삭제하지 못했습니다."),
      );
      return false;
    } finally {
      setTeacherLeaderboardSaving(false);
    }
  }

  function setTeacherPublishState(nextPublished) {
    setTeacherPublished(nextPublished);
    setTeacherDirty(true);
    clearTeacherAutoSaveTimer(teacherAutoSaveTimerRef);
    setTeacherAutoSaveToken(0);
    setTeacherAutoSaveStatus("");
    setTeacherStatus("");
  }

  async function persistTeacherGradePublisher(grade, publisher) {
    if (!teacherProfile || !userId) {
      throw new Error("선생님 정보가 필요합니다.");
    }

    const cleanGrade = String(grade ?? "").trim();
    const cleanPublisher = String(publisher ?? "").trim();

    if (!cleanGrade || !cleanPublisher) {
      throw new Error("출판사를 먼저 선택하세요.");
    }

    const nextGradePublishers = {
      ...(teacherProfile.gradePublishers ?? {}),
      [cleanGrade]: cleanPublisher,
    };

    await upsertTeacherProfile({
      userId,
      teacherName: teacherProfile.teacherName,
      schoolId: teacherProfile.schoolId,
      schoolName: teacherProfile.schoolName,
      gradePublishers: nextGradePublishers,
    });

    setTeacherProfile((current) =>
      current
        ? {
            ...current,
            gradePublishers: nextGradePublishers,
          }
        : current,
    );

    return nextGradePublishers;
  }

  function canAutoSaveTeacherSet(snapshot = teacherAutoSaveSnapshotRef.current) {
    const cleanPublisher = String(snapshot?.publisher ?? "").trim();
    return Boolean(
      isFirebaseConfigured &&
        snapshot?.userId &&
        snapshot?.profile &&
        snapshot?.selection?.grade &&
        snapshot?.selection?.unit &&
        cleanPublisher &&
        snapshot?.dirty &&
        !snapshot?.loading &&
        !snapshot?.saving &&
        !snapshot?.importing &&
        !snapshot?.copying,
    );
  }

  async function persistTeacherSetSnapshot(snapshot, sourceType) {
    if (!snapshot?.profile || !snapshot?.userId) {
      throw new Error("Google 로그인과 선생님 정보 등록이 필요합니다.");
    }

    const selection = snapshot.selection ?? {};
    if (!selection.grade || !selection.unit) {
      throw new Error("학년과 단원을 먼저 선택하세요.");
    }

    const cleanPublisher = String(snapshot.publisher ?? "").trim();
    if (!cleanPublisher) {
      throw new Error("출판사를 먼저 선택하세요.");
    }

    const nextGradePublishers = {
      ...(snapshot.profile.gradePublishers ?? {}),
      [selection.grade]: cleanPublisher,
    };

    await upsertTeacherProfile({
      userId: snapshot.userId,
      teacherName: snapshot.profile.teacherName,
      schoolId: snapshot.profile.schoolId,
      schoolName: snapshot.profile.schoolName,
      gradePublishers: nextGradePublishers,
    });

    setTeacherProfile((current) =>
      current
        ? {
            ...current,
            gradePublishers: nextGradePublishers,
          }
        : current,
    );

    await saveTeacherVocabularySet({
      userId: snapshot.userId,
      schoolId: snapshot.profile.schoolId,
      schoolName: snapshot.profile.schoolName,
      teacherName: snapshot.profile.teacherName,
      selection,
      items: snapshot.items ?? [],
      published: snapshot.published,
      publisher: cleanPublisher,
      sourceType,
    });

    return {
      cleanPublisher,
      nextGradePublishers,
    };
  }

  function queueTeacherAutoSave() {
    if (!teacherDirty) {
      setTeacherAutoSaveStatus("");
      return;
    }

    clearTeacherAutoSaveTimer(teacherAutoSaveTimerRef);

    if (!canAutoSaveTeacherSet()) {
      setTeacherAutoSaveStatus("자동 저장 대기 중");
      return;
    }

    setTeacherAutoSaveStatus("자동 저장 예약 중");
    teacherAutoSaveTimerRef.current = window.setTimeout(async () => {
      const snapshot = teacherAutoSaveSnapshotRef.current;
      if (!canAutoSaveTeacherSet(snapshot)) {
        setTeacherAutoSaveStatus("자동 저장 대기 중");
        clearTeacherAutoSaveTimer(teacherAutoSaveTimerRef);
        return;
      }

      setTeacherAutoSaveStatus("자동 저장 중...");

      try {
        const { cleanPublisher } = await persistTeacherSetSnapshot(
          snapshot,
          "autosave",
        );
        setTeacherPublisherDraft(cleanPublisher);
        setTeacherDirty(false);
        setTeacherAutoSaveStatus("자동 저장됨");
        setTeacherError("");
        await refreshTeacherCatalog();
      } catch (error) {
        setTeacherAutoSaveStatus("자동 저장 실패");
        setTeacherError(
          normalizeErrorMessage(error, "단어 세트를 자동 저장하지 못했습니다."),
        );
      } finally {
        clearTeacherAutoSaveTimer(teacherAutoSaveTimerRef);
      }
    }, 700);
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
    setTeacherAutoSaveStatus("");
    setTeacherError("");
    clearTeacherAutoSaveTimer(teacherAutoSaveTimerRef);
    setTeacherAutoSaveToken(0);

    try {
      const result = await fetchTeacherVocabularySet(userId, teacherSelection);
      const profilePublisher =
        teacherProfile?.gradePublishers?.[teacherSelection.grade] ?? "";
      const resolvedPublisher =
        profilePublisher || String(result.publisher ?? "").trim();
      setTeacherItems(result.items);
      setTeacherPublished(result.published);
      setTeacherPublisherDraft(resolvedPublisher);
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

    clearTeacherAutoSaveTimer(teacherAutoSaveTimerRef);
    setTeacherAutoSaveToken(0);
    setTeacherAutoSaveStatus("");

    const snapshot = teacherAutoSaveSnapshotRef.current ?? {
      userId,
      profile: teacherProfile,
      selection: teacherSelection,
      publisher: teacherPublisherDraft,
      published: teacherPublished,
      items: teacherItems,
      dirty: teacherDirty,
    };

    if (!snapshot.profile || !snapshot.userId) {
      setTeacherError("Google 로그인과 선생님 정보 등록이 필요합니다.");
      return;
    }

    if (!snapshot.selection?.grade || !snapshot.selection?.unit) {
      setTeacherError("학년과 단원을 먼저 선택하세요.");
      return;
    }

    if (!String(snapshot.publisher ?? "").trim()) {
      setTeacherError("출판사를 먼저 선택하세요.");
      return;
    }

    const cleanPublisher = String(snapshot.publisher ?? "").trim();

    setTeacherSaving(true);
    setTeacherStatus("");
    setTeacherError("");

    try {
      await persistTeacherSetSnapshot(snapshot, "manual");
      setTeacherPublisherDraft(cleanPublisher);
      setTeacherDirty(false);
      setTeacherStatus(
        snapshot.published
          ? `${formatSetLabel(snapshot.selection)} 세트를 저장하고 학생에게 공개했습니다.`
          : `${formatSetLabel(snapshot.selection)} 세트를 저장했습니다. 아직 공개 전입니다.`,
      );
      setTeacherAutoSaveStatus("");
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

    clearTeacherAutoSaveTimer(teacherAutoSaveTimerRef);
    setTeacherAutoSaveToken(0);
    setTeacherAutoSaveStatus("");
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

    clearTeacherAutoSaveTimer(teacherAutoSaveTimerRef);
    setTeacherAutoSaveToken(0);
    setTeacherAutoSaveStatus("");
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

    const cleanPublisher = teacherPublisherDraft.trim();
    if (!cleanPublisher) {
      setTeacherError("출판사를 먼저 선택하세요.");
      return;
    }

    setTeacherImporting(true);
    setTeacherStatus("");
    setTeacherAutoSaveStatus("");
    setTeacherError("");
    clearTeacherAutoSaveTimer(teacherAutoSaveTimerRef);
    setTeacherAutoSaveToken(0);

    try {
      await persistTeacherGradePublisher(grade, cleanPublisher);
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
          publisher: cleanPublisher,
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
      setTeacherPublisherDraft(cleanPublisher);

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
    setTeacherAutoSaveToken((current) => current + 1);
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
    setTeacherAutoSaveToken((current) => current + 1);
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
    setTeacherAutoSaveToken((current) => current + 1);
  }

  function clearTeacherItems() {
    setTeacherItems([]);
    setTeacherDirty(true);
    setTeacherAutoSaveToken((current) => current + 1);
  }

  async function searchTeacherCopySources() {
    if (!isFirebaseConfigured || !teacherProfile) {
      setTeacherCopyError("선생님 정보 등록 후 사용할 수 있습니다.");
      return;
    }

    if (teacherDirty) {
      setTeacherCopyError("저장되지 않은 변경사항이 있습니다. 먼저 저장하세요.");
      return;
    }

    if (!teacherSelection.grade) {
      setTeacherCopyError("학년을 먼저 선택하세요.");
      return;
    }

    const cleanPublisher = teacherPublisherDraft.trim();
    if (!cleanPublisher) {
      setTeacherCopyError("검색할 출판사를 먼저 선택하세요.");
      return;
    }

    setTeacherCopyLoading(true);
    setTeacherCopyError("");
    setTeacherCopyStatus("");
    setTeacherCopySources([]);
    setTeacherSelectedCopySourceId("");

    try {
      const entries = await searchPublishedPublisherSources({
        grade: teacherSelection.grade,
        publisher: cleanPublisher,
      });
      const grouped = groupPublisherSourcesByTeacherAndSchool(
        entries,
        teacherProfile.schoolId,
      );
      setTeacherCopySources(grouped);
      setTeacherCopyStatus(
        grouped.length > 0
          ? `${teacherSelection.grade}학년 ${cleanPublisher} 공개 카드 ${grouped.length}건을 찾았습니다. 우리 학교 카드도 함께 표시됩니다.`
          : "해당 출판사의 공개 카드가 없습니다.",
      );
    } catch (error) {
      setTeacherCopyError(
        normalizeErrorMessage(
          error,
          "다른 학교 단어카드를 검색하지 못했습니다.",
        ),
      );
    } finally {
      setTeacherCopyLoading(false);
    }
  }

  function selectTeacherCopySource(sourceId) {
    setTeacherSelectedCopySourceId(sourceId);
    setTeacherCopyStatus("");
    setTeacherCopyError("");
  }

  async function copyTeacherPublisherSource() {
    if (!isFirebaseConfigured || !teacherProfile || !userId) {
      setTeacherCopyError("선생님 정보 등록 후 사용할 수 있습니다.");
      return false;
    }

    if (teacherDirty) {
      setTeacherCopyError("저장되지 않은 변경사항이 있습니다. 먼저 저장하세요.");
      return false;
    }

    const selectedSource = teacherCopySources.find(
      (source) => source.id === teacherSelectedCopySourceId,
    );

    if (!selectedSource) {
      setTeacherCopyError("복사할 단어카드를 먼저 선택하세요.");
      return false;
    }

    const publisherToPersist =
      teacherPublisherDraft.trim() || selectedSource.publisher;

    if (!publisherToPersist) {
      setTeacherCopyError("출판사를 먼저 선택하세요.");
      return false;
    }

    setTeacherCopying(true);
    setTeacherCopyError("");
    setTeacherCopyStatus("");

    try {
      await persistTeacherGradePublisher(
        teacherSelection.grade,
        publisherToPersist,
      );

      const sourceSets = await fetchPublishedPublisherSourceUnits({
        ownerUid: selectedSource.ownerUid,
        grade: teacherSelection.grade,
        publisher: selectedSource.publisher,
      });

      let savedUnitCount = 0;
      let addedVocabularyCount = 0;
      let duplicateVocabularyCount = 0;
      const savedItemsByUnit = new Map();

      for (const sourceSet of sourceSets) {
        const existingSet = await fetchTeacherVocabularySet(userId, {
          grade: teacherSelection.grade,
          unit: sourceSet.unit,
        });

        const { mergedItems, addedCount, duplicateCount } = mergeVocabularyItems(
          existingSet.items ?? [],
          sourceSet.items ?? [],
        );
        const normalizedItems = normalizeDraftVocabulary(mergedItems);

        await saveTeacherVocabularySet({
          userId,
          schoolId: teacherProfile.schoolId,
          schoolName: teacherProfile.schoolName,
          teacherName: teacherProfile.teacherName,
          selection: { grade: teacherSelection.grade, unit: sourceSet.unit },
          items: normalizedItems,
          published: teacherPublished,
          publisher: publisherToPersist,
          sourceType: "copied",
        });

        savedUnitCount += 1;
        addedVocabularyCount += addedCount;
        duplicateVocabularyCount += duplicateCount;
        savedItemsByUnit.set(sourceSet.unit, normalizedItems);
      }

      await refreshTeacherCatalog();

      if (savedItemsByUnit.has(teacherSelection.unit)) {
        setTeacherItems(savedItemsByUnit.get(teacherSelection.unit) ?? []);
        setTeacherPublished(teacherPublished);
        setTeacherDirty(false);
      }

    setTeacherPublisherDraft(publisherToPersist);
      setTeacherCopyStatus(
        summarizePublisherCopyResult({
          savedUnitCount,
          addedVocabularyCount,
          duplicateVocabularyCount,
        }),
      );
      setTeacherStatus(
        `${selectedSource.schoolName} ${selectedSource.teacherName} 선생님의 공개 카드를 복사했습니다.`,
      );
      return true;
    } catch (error) {
      setTeacherCopyError(
        normalizeErrorMessage(
          error,
          "다른 학교 단어카드를 복사하지 못했습니다.",
        ),
      );
      return false;
    } finally {
      setTeacherCopying(false);
    }
  }

  function updateStudentSchoolQuery(value) {
    setStudentSchoolQuery(value);
    if (!value.trim()) {
      setStudentSchoolBrowseMode("featured");
      setStudentSchoolResults([]);
      setSelectedSchool(null);
      setSelectedTeacher(null);
      setStudentNameDraft("");
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
      setStudentNameDraft("");
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
    setStudentNameDraft("");
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
    setStudentNameDraft("");
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
      setStudentNameDraft("");
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

  useEffect(() => {
    if (!teacherSelection.grade) {
      setTeacherBingoUnits([]);
      return;
    }

    if (teacherUnits.length === 0) {
      setTeacherBingoUnits([]);
      return;
    }

    setTeacherBingoUnits((current) => {
      const normalizedCurrent = Array.from(
        new Set(
          (Array.isArray(current) ? current : [])
            .map((unit) => String(unit ?? "").trim())
            .filter((unit) => teacherUnits.includes(unit)),
        ),
      ).sort((left, right) =>
        String(left).localeCompare(String(right), undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );

      if (normalizedCurrent.length > 0) {
        return normalizedCurrent;
      }

      const seededUnit = teacherUnits.includes(teacherSelection.unit)
        ? teacherSelection.unit
        : teacherUnits[0];

      return seededUnit ? [seededUnit] : [];
    });
  }, [teacherSelection.grade, teacherSelection.unit, teacherUnits]);

  function toggleTeacherBingoUnit(unit) {
    const cleanUnit = String(unit ?? "").trim();
    if (!cleanUnit || !teacherUnits.includes(cleanUnit)) {
      return;
    }

    setTeacherBingoUnits((current) => {
      const hasUnit = current.includes(cleanUnit);
      const nextUnits = hasUnit
        ? current.filter((entry) => entry !== cleanUnit)
        : [...current, cleanUnit];

      return nextUnits.sort((left, right) =>
        String(left).localeCompare(String(right), undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );
    });
  }

  const teacherBingoSelectedCatalogEntries = useMemo(() => {
    if (!teacherSelection.grade || teacherBingoUnits.length === 0) {
      return [];
    }

    return teacherBingoUnits
      .map((unit) =>
        teacherCatalog.find(
          (entry) =>
            String(entry.grade ?? "").trim() === teacherSelection.grade &&
            String(entry.unit ?? "").trim() === unit,
        ),
      )
      .filter(Boolean);
  }, [teacherCatalog, teacherBingoUnits, teacherSelection.grade]);

  const teacherBingoItems = useMemo(() => {
    return buildTeacherBingoItemsFromCatalog(
      teacherCatalog,
      teacherSelection.grade,
      teacherBingoUnits,
    );
  }, [teacherCatalog, teacherBingoUnits, teacherSelection.grade]);

  const teacherBingoBoardSize = useMemo(() => {
    if (teacherBingoItems.length < 9) {
      return 0;
    }

    return determineBingoBoardSize(teacherBingoItems.length);
  }, [teacherBingoItems.length]);

  const teacherBingoCanStart = Boolean(
    teacherProfile?.userId &&
      teacherSelection.grade &&
      teacherBingoUnits.length > 0 &&
      teacherBingoItems.length >= 9,
  );

  async function prepareTeacherBingoSession() {
    if (!isFirebaseConfigured || !teacherProfile || !userId) {
      throw new Error("Google 로그인과 선생님 정보 등록이 필요합니다.");
    }

    if (!teacherSelection.grade || teacherBingoUnits.length === 0) {
      throw new Error("빙고에 사용할 학년과 단원을 먼저 선택하세요.");
    }

    const snapshot = teacherAutoSaveSnapshotRef.current;
    const currentUnitIncluded = teacherBingoUnits.includes(
      String(teacherSelection.unit ?? "").trim(),
    );

    if (snapshot?.dirty && currentUnitIncluded) {
      clearTeacherAutoSaveTimer(teacherAutoSaveTimerRef);
      setTeacherAutoSaveToken(0);
      setTeacherAutoSaveStatus("빙고 시작 전 자동 저장 중...");
      await persistTeacherSetSnapshot(snapshot, "manual");
      setTeacherDirty(false);
      setTeacherAutoSaveStatus("자동 저장됨");
    }

    const latestCatalog = await listTeacherSetCatalog(userId);
    setTeacherCatalog(latestCatalog);

    const mergedItems = buildTeacherBingoItemsFromCatalog(
      latestCatalog,
      teacherSelection.grade,
      teacherBingoUnits,
    );

    if (mergedItems.length < 9) {
      throw new Error("빙고를 시작하려면 선택 단원에 단어가 9개 이상 있어야 합니다.");
    }

    const boardSize = determineBingoBoardSize(mergedItems.length);
    const selectedUnitLabels = teacherBingoUnits.map((unit) => `${unit}단원`);

    return {
      teacherUserId: teacherProfile.userId,
      teacherName: teacherProfile.teacherName,
      schoolId: teacherProfile.schoolId,
      schoolName: teacherProfile.schoolName,
      grade: teacherSelection.grade,
      unit: teacherBingoUnits[0],
      publisher: teacherPublisherDraft,
      selectedUnits: teacherBingoUnits,
      selectedUnitLabels,
      items: mergedItems,
      boardSize,
    };
  }

  const teacherBingoSelectedUnitLabels = useMemo(
    () => teacherBingoUnits.map((unit) => `${unit}단원`),
    [teacherBingoUnits],
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

  useEffect(() => {
    const profilePublisher =
      teacherProfile?.gradePublishers?.[teacherSelection.grade] ?? "";

    setTeacherPublisherDraft(profilePublisher);
    setTeacherCopySources([]);
    setTeacherSelectedCopySourceId("");
    setTeacherCopyStatus("");
    setTeacherCopyError("");
  }, [teacherProfile?.gradePublishers, teacherSelection.grade]);

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
      publisher: teacherPublisherDraft,
      published: teacherPublished,
      dirty: teacherDirty,
      loading: teacherLoading || teacherCatalogLoading,
      saving: teacherSaving,
      importing: teacherImporting,
      status: teacherStatus,
      autoSaveStatus: teacherAutoSaveStatus,
      error: teacherError,
      copySources: teacherCopySources,
      selectedCopySourceId: teacherSelectedCopySourceId,
      copyLoading: teacherCopyLoading,
      copying: teacherCopying,
      copyStatus: teacherCopyStatus,
      copyError: teacherCopyError,
      leaderboard: {
        boards: teacherLeaderboards,
        loading: teacherLeaderboardLoading,
        error: teacherLeaderboardError,
        status: teacherLeaderboardStatus,
        tab: teacherLeaderboardTab,
        setTab: setTeacherLeaderboardTab,
        activityType: teacherLeaderboardActivityType,
        setActivityType: updateTeacherLeaderboardActivityType,
        editingName: teacherLeaderboardEditingName,
        draftName: teacherLeaderboardDraftName,
        saving: teacherLeaderboardSaving,
        refresh: refreshTeacherLeaderboards,
        startEdit: startTeacherLeaderboardEdit,
        cancelEdit: cancelTeacherLeaderboardEdit,
        setDraftName: setTeacherLeaderboardDraftName,
        renameStudent: renameTeacherLeaderboardStudent,
        deleteStudent: deleteTeacherLeaderboardStudent,
      },
      bingo: {
        availableUnits: teacherUnits,
        selectedUnits: teacherBingoUnits,
        selectedUnitLabels: teacherBingoSelectedUnitLabels,
        items: teacherBingoItems,
        boardSize: teacherBingoBoardSize,
        canStart: teacherBingoCanStart,
        toggleUnit: toggleTeacherBingoUnit,
        prepareSession: prepareTeacherBingoSession,
      },
      units: teacherUnits,
      catalogEntry: currentTeacherCatalogEntry,
      updateSelection: updateTeacherSelection,
      updatePublisher: updateTeacherPublisher,
      setPublished: setTeacherPublishState,
      loadSet: loadTeacherSet,
      saveSet: saveTeacherSet,
      deleteSet: removeTeacherSet,
      resetGradeSets: resetTeacherGradeSets,
      importWorkbook,
      searchCopySources: searchTeacherCopySources,
      selectCopySource: selectTeacherCopySource,
      copySource: copyTeacherPublisherSource,
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
      leaderboardContext: {
        schoolId: selectedSchool?.id ?? "",
        schoolName: selectedSchool?.name ?? "",
        grade: studentSelection.grade,
      },
      units: studentUnits,
      unitsLoading: studentUnitsLoading,
      items: studentItems,
      matchingUnits: studentMatchingUnits,
      matchingItems: studentMatchingItems,
      nameDraft: studentNameDraft,
      loading: studentLoading,
      status: studentStatus,
      error: studentError,
      progressionContext: {
        schoolId: selectedSchool?.id ?? "",
        schoolName: selectedSchool?.name ?? "",
        grade: studentSelection.grade,
        unit: studentSelection.unit,
        teacherUserId: selectedTeacher?.userId ?? "",
        teacherName: selectedTeacher?.teacherName ?? "",
      },
      updateSchoolQuery: updateStudentSchoolQuery,
      searchSchools: searchStudentSchools,
      chooseSchool: chooseStudentSchool,
      chooseTeacher: chooseStudentTeacher,
      updateSelection: updateStudentSelection,
      updateNameDraft: setStudentNameDraft,
      loadSet: loadStudentSet,
      toggleMatchingUnit: toggleStudentMatchingUnit,
      seedMatchingUnits: seedStudentMatchingUnits,
      loadMatchingSet: loadStudentMatchingSet,
    },
  };
}
