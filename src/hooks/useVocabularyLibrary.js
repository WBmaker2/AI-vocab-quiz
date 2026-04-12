import { useEffect, useState } from "react";
import {
  deleteTeacherAccountData,
  findOrCreateSchool,
  getCurrentUser,
  getTeacherProfile,
  isFirebaseConfigured,
  searchSchoolsByName,
  signInWithGoogle,
  signOutCurrentUser,
  subscribeToAuthChanges,
  syncTeacherVocabularyMetadata,
  upsertTeacherProfile,
} from "../lib/firebase.js";
import { useStudentSetLoader } from "./student/useStudentSetLoader.js";
import { useTeacherBingoPreparation } from "./teacher/useTeacherBingoPreparation.js";
import { useTeacherLeaderboards } from "./teacher/useTeacherLeaderboards.js";
import { useTeacherSetManager } from "./teacher/useTeacherSetManager.js";

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

  const userId = session?.user?.uid ?? "";
  const student = useStudentSetLoader({
    formatErrorMessage: normalizeErrorMessage,
  });
  const teacherSet = useTeacherSetManager({
    userId,
    teacherProfile,
    setTeacherProfile,
    formatErrorMessage: normalizeErrorMessage,
  });
  const teacherLeaderboard = useTeacherLeaderboards({
    userId,
    schoolId: teacherProfile?.schoolId ?? "",
    grade: teacherSet.selection.grade,
    formatErrorMessage: normalizeErrorMessage,
  });
  const teacherBingo = useTeacherBingoPreparation({
    userId,
    teacherProfile,
    teacherCatalog: teacherSet.teacherCatalog,
    setTeacherCatalog: teacherSet.setTeacherCatalog,
    teacherSelection: teacherSet.teacherSelection,
    teacherPublisherDraft: teacherSet.teacherPublisherDraft,
    teacherAutoSaveSnapshotRef: teacherSet.teacherAutoSaveSnapshotRef,
    clearTeacherAutoSaveTimer: teacherSet.clearTeacherAutoSaveTimer,
    teacherAutoSaveTimerRef: teacherSet.teacherAutoSaveTimerRef,
    setTeacherAutoSaveToken: teacherSet.setTeacherAutoSaveToken,
    setTeacherAutoSaveStatus: teacherSet.setTeacherAutoSaveStatus,
    persistTeacherSetSnapshot: teacherSet.persistTeacherSetSnapshot,
    setTeacherDirty: teacherSet.setTeacherDirty,
  });

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
      await student.refreshFeaturedSchools();

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
      setOnboarding((current) => ({
        ...current,
        error: "삭제할 선생님 정보가 없습니다.",
      }));
      return false;
    }

    setOnboarding((current) => ({
      ...current,
      saving: true,
      error: "",
      status: "",
    }));

    const preservedTeacherName =
      mode === "school" ? teacherProfile.teacherName : "";

    try {
      await deleteTeacherAccountData(userId);

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

      await student.refreshFeaturedSchools();
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
      selection: teacherSet.selection,
      items: teacherSet.items,
      publisher: teacherSet.publisher,
      published: teacherSet.published,
      dirty: teacherSet.dirty,
      loading: teacherSet.loading,
      saving: teacherSet.saving,
      importing: teacherSet.importing,
      status: teacherSet.status,
      autoSaveStatus: teacherSet.autoSaveStatus,
      error: teacherSet.error,
      copySources: teacherSet.copySources,
      selectedCopySourceId: teacherSet.selectedCopySourceId,
      copyLoading: teacherSet.copyLoading,
      copying: teacherSet.copying,
      copyStatus: teacherSet.copyStatus,
      copyError: teacherSet.copyError,
      leaderboard: teacherLeaderboard,
      bingo: teacherBingo,
      units: teacherBingo.availableUnits,
      catalogEntry: teacherSet.catalogEntry,
      updateSelection: teacherSet.updateSelection,
      updatePublisher: teacherSet.updatePublisher,
      setPublished: teacherSet.setPublished,
      loadSet: teacherSet.loadSet,
      saveSet: teacherSet.saveSet,
      deleteSet: teacherSet.deleteSet,
      resetGradeSets: teacherSet.resetGradeSets,
      importWorkbook: teacherSet.importWorkbook,
      searchCopySources: teacherSet.searchCopySources,
      selectCopySource: teacherSet.selectCopySource,
      copySource: teacherSet.copySource,
      addItem: teacherSet.addItem,
      updateItem: teacherSet.updateItem,
      removeItem: teacherSet.removeItem,
      clearItems: teacherSet.clearItems,
    },
    student,
  };
}
