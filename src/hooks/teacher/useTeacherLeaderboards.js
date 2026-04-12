import { useEffect, useState } from "react";
import {
  deleteTeacherActivityLeaderboardStudent,
  fetchTeacherActivityLeaderboards,
  isFirebaseConfigured,
  renameTeacherActivityLeaderboardStudent,
} from "../../lib/firebase.js";
import {
  getTeacherActivityLeaderboardDefinition,
  summarizeTeacherLeaderboardOutcome,
} from "../../utils/teacherLeaderboards.js";

function defaultFormatErrorMessage(error, fallback) {
  if (!error) {
    return fallback;
  }

  return error.message || fallback;
}

function getFirstLeaderboardTab(boards, currentTab) {
  return boards[currentTab] ? currentTab : Object.keys(boards)[0] ?? "week";
}

export function useTeacherLeaderboards({
  userId,
  schoolId,
  grade,
  formatErrorMessage = defaultFormatErrorMessage,
}) {
  const [boards, setBoards] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [tab, setTab] = useState("week");
  const [activityType, setActivityType] = useState("matching");
  const [editingName, setEditingName] = useState("");
  const [draftName, setDraftName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured || userId) {
      return;
    }

    setBoards({});
    setLoading(false);
    setError("");
    setStatus("");
    setTab("week");
    setEditingName("");
    setDraftName("");
    setSaving(false);
    setActivityType("matching");
  }, [userId]);

  useEffect(() => {
    if (!isFirebaseConfigured || !schoolId || !grade) {
      setBoards({});
      setLoading(false);
      setError("");
      setStatus("");
      setEditingName("");
      setDraftName("");
      return;
    }

    let cancelled = false;

    async function loadTeacherLeaderboards() {
      setLoading(true);
      setError("");
      setStatus("");

      try {
        const nextBoards = await fetchTeacherActivityLeaderboards({
          activityType,
          schoolId,
          grade,
          limitCount: 20,
        });

        if (!cancelled) {
          setBoards(nextBoards);
          setTab((current) => getFirstLeaderboardTab(nextBoards, current));
          setEditingName("");
          setDraftName("");
        }
      } catch (nextError) {
        if (!cancelled) {
          setBoards({});
          setError(
            formatErrorMessage(nextError, "리더보드를 불러오지 못했습니다."),
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTeacherLeaderboards();

    return () => {
      cancelled = true;
    };
  }, [activityType, formatErrorMessage, grade, schoolId]);

  function updateActivityType(nextType) {
    setActivityType(nextType);
    setStatus("");
    setError("");
    setEditingName("");
    setDraftName("");
  }

  function refresh() {
    if (!schoolId || !grade) {
      setBoards({});
      return Promise.resolve();
    }

    setLoading(true);
    setError("");
    setStatus("");

    return fetchTeacherActivityLeaderboards({
      activityType,
      schoolId,
      grade,
      limitCount: 20,
    })
      .then((nextBoards) => {
        setBoards(nextBoards);
        setTab((current) => getFirstLeaderboardTab(nextBoards, current));
      })
      .catch((nextError) => {
        setError(
          formatErrorMessage(nextError, "리더보드를 불러오지 못했습니다."),
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function startEdit(studentName) {
    const cleanName = String(studentName ?? "").trim();
    if (!cleanName) {
      return;
    }

    setEditingName(cleanName);
    setDraftName(cleanName);
    setStatus("");
    setError("");
  }

  function cancelEdit() {
    setEditingName("");
    setDraftName("");
  }

  async function renameStudent(oldName, newName) {
    if (!schoolId || !grade) {
      setError("학교와 학년 정보를 확인한 뒤 다시 시도해 주세요.");
      return false;
    }

    const cleanOldName = String(oldName ?? "").trim().replace(/\s+/g, " ");
    const cleanNewName = String(newName ?? "").trim().replace(/\s+/g, " ");

    if (!cleanOldName || !cleanNewName) {
      setError("학생 이름을 입력해 주세요.");
      return false;
    }

    if (cleanOldName === cleanNewName) {
      setError("같은 이름으로는 수정할 수 없습니다.");
      return false;
    }

    const activityDefinition =
      getTeacherActivityLeaderboardDefinition(activityType);

    if (
      !window.confirm(
        `'${cleanOldName}' 이름을 '${cleanNewName}'(으)로 현재 ${activityDefinition.label} 리더보드의 주/월/연/우리학교 전체 기록에서 모두 수정할까요?`,
      )
    ) {
      return false;
    }

    setSaving(true);
    setError("");
    setStatus("");

    try {
      const result = await renameTeacherActivityLeaderboardStudent({
        activityType,
        schoolId,
        grade,
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

      cancelEdit();
      await refresh();

      setStatus(
        [updatedLabel, keptLabel, skippedLabel].filter(Boolean).join(" · ") ||
          `${activityDefinition.label} 리더보드 학생 이름을 수정했습니다.`,
      );
      return true;
    } catch (nextError) {
      setError(formatErrorMessage(nextError, "학생 이름을 수정하지 못했습니다."));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function deleteStudent(studentName) {
    if (!schoolId || !grade) {
      setError("학교와 학년 정보를 확인한 뒤 다시 시도해 주세요.");
      return false;
    }

    const cleanStudentName = String(studentName ?? "").trim().replace(/\s+/g, " ");
    if (!cleanStudentName) {
      setError("삭제할 학생 이름이 없습니다.");
      return false;
    }

    const activityDefinition =
      getTeacherActivityLeaderboardDefinition(activityType);

    if (
      !window.confirm(
        `'${cleanStudentName}' 학생 기록을 현재 ${activityDefinition.label} 리더보드의 주/월/연/우리학교 전체 기록에서 모두 삭제할까요?`,
      )
    ) {
      return false;
    }

    setSaving(true);
    setError("");
    setStatus("");

    try {
      const result = await deleteTeacherActivityLeaderboardStudent({
        activityType,
        schoolId,
        grade,
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

      if (editingName === cleanStudentName) {
        cancelEdit();
      }

      await refresh();
      setStatus(
        [deletedLabel, skippedLabel].filter(Boolean).join(" · ") ||
          `${activityDefinition.label} 리더보드 학생 기록을 삭제했습니다.`,
      );
      return true;
    } catch (nextError) {
      setError(formatErrorMessage(nextError, "학생 기록을 삭제하지 못했습니다."));
      return false;
    } finally {
      setSaving(false);
    }
  }

  return {
    boards,
    loading,
    error,
    status,
    tab,
    setTab,
    activityType,
    setActivityType: updateActivityType,
    editingName,
    draftName,
    saving,
    refresh,
    startEdit,
    cancelEdit,
    setDraftName,
    renameStudent,
    deleteStudent,
  };
}
