import { useCallback, useEffect, useState } from "react";
import { saveStudentProgress } from "../../lib/firebase.js";
import { formatAppError } from "../../utils/appError.js";

export function useActivityProgression({
  remoteConfigured,
  progressionContext,
  studentNameDraft,
  onStudentNameDraftChange,
  score,
  activityType,
  activityNoun,
  extraResult = {},
}) {
  const [progressionLoading, setProgressionLoading] = useState(false);
  const [progressionStatus, setProgressionStatus] = useState("");
  const [progressionError, setProgressionError] = useState("");
  const [progressionComparison, setProgressionComparison] = useState(null);
  const [newlyEarnedBadges, setNewlyEarnedBadges] = useState([]);
  const [progressionStudentName, setProgressionStudentName] = useState("");
  const hasSavedProgress = Boolean(progressionStudentName);
  const progressionDisabledReason = !remoteConfigured
    ? "Firebase 연결이 없어 이 기기에서는 개인 기록을 저장할 수 없습니다."
    : !progressionContext?.schoolId || !progressionContext?.schoolName || !progressionContext?.grade
      ? "학교와 학년을 먼저 선택하면 개인 최고 기록과 배지를 저장할 수 있어요."
      : !String(studentNameDraft ?? "").trim()
        ? "학생 이름을 입력하면 개인 최고 기록과 배지를 저장할 수 있어요."
        : "";

  const handleSaveProgress = useCallback(async () => {
    const cleanStudentName = String(studentNameDraft ?? "")
      .trim()
      .replace(/\s+/g, " ");
    const schoolId = String(progressionContext?.schoolId ?? "").trim();
    const schoolName = String(progressionContext?.schoolName ?? "").trim();
    const grade = String(progressionContext?.grade ?? "").trim();

    if (!remoteConfigured) {
      setProgressionError("Firebase 연결이 없어 개인 기록을 저장할 수 없습니다.");
      return;
    }

    if (!schoolId || !schoolName || !grade) {
      setProgressionError("학교와 학년을 확인한 뒤 다시 시도해 주세요.");
      return;
    }

    if (!cleanStudentName) {
      setProgressionError("학생 이름을 입력해 주세요.");
      return;
    }

    setProgressionLoading(true);
    setProgressionError("");
    setProgressionStatus("");

    try {
      const saved = await saveStudentProgress({
        schoolId,
        schoolName,
        grade,
        studentName: cleanStudentName,
        activityType,
        result: {
          score,
          correctCount: score,
          ...extraResult,
        },
      });

      onStudentNameDraftChange?.(cleanStudentName);
      setProgressionStudentName(cleanStudentName);
      setProgressionComparison(saved.comparison);
      setNewlyEarnedBadges(saved.newlyEarnedBadges ?? []);
      setProgressionStatus(
        `${cleanStudentName} 학생의 ${activityNoun} 성장 기록을 저장했습니다.`,
      );
    } catch (error) {
      setProgressionError(
        formatAppError(error, "개인 기록을 저장하지 못했습니다."),
      );
    } finally {
      setProgressionLoading(false);
    }
  }, [activityNoun, activityType, extraResult, onStudentNameDraftChange, progressionContext, remoteConfigured, score, studentNameDraft]);

  const resetProgression = useCallback(() => {
    setProgressionLoading(false);
    setProgressionStatus("");
    setProgressionError("");
    setProgressionComparison(null);
    setNewlyEarnedBadges([]);
    setProgressionStudentName("");
  }, []);

  useEffect(() => {
    const cleanDraft = String(studentNameDraft ?? "").trim().replace(/\s+/g, " ");
    const cleanSaved = String(progressionStudentName ?? "").trim().replace(/\s+/g, " ");

    if (cleanSaved && cleanDraft && cleanSaved === cleanDraft) {
      return;
    }

    if (!cleanDraft || (cleanSaved && cleanSaved !== cleanDraft)) {
      setProgressionStatus("");
      setProgressionError("");
      setProgressionComparison(null);
      setNewlyEarnedBadges([]);
      if (cleanSaved && cleanSaved !== cleanDraft) {
        setProgressionStudentName("");
      }
    }
  }, [progressionStudentName, studentNameDraft]);

  return {
    progressionLoading,
    progressionStatus,
    progressionError,
    progressionComparison,
    newlyEarnedBadges,
    progressionStudentName,
    hasSavedProgress,
    progressionDisabledReason,
    handleSaveProgress,
    resetProgression,
    setProgressionStatus,
    setProgressionError,
    setProgressionComparison,
    setNewlyEarnedBadges,
    setProgressionStudentName,
  };
}
