import { useEffect, useMemo, useState } from "react";
import { getUnitsForGrade } from "../../constants/vocabulary.js";
import { isFirebaseConfigured, listTeacherSetCatalog } from "../../lib/firebase.js";
import { determineBingoBoardSize } from "../../utils/bingo.js";
import {
  buildTeacherBingoItemsFromCatalog,
  buildTeacherBingoSelectedUnitLabels,
  createTeacherBingoSessionDraft,
  deriveTeacherBingoUnits,
  sortTeacherBingoUnits,
} from "../../utils/teacherBingoPreparation.js";

export function useTeacherBingoPreparation({
  userId,
  teacherProfile,
  teacherCatalog,
  setTeacherCatalog,
  teacherSelection,
  teacherPublisherDraft,
  teacherAutoSaveSnapshotRef,
  clearTeacherAutoSaveTimer,
  teacherAutoSaveTimerRef,
  setTeacherAutoSaveToken,
  setTeacherAutoSaveStatus,
  persistTeacherSetSnapshot,
  setTeacherDirty,
}) {
  const [selectedUnits, setSelectedUnits] = useState([]);

  const availableUnits = useMemo(
    () => getUnitsForGrade(teacherCatalog, teacherSelection.grade),
    [teacherCatalog, teacherSelection.grade],
  );

  useEffect(() => {
    setSelectedUnits((current) =>
      deriveTeacherBingoUnits({
        availableUnits,
        currentUnits: current,
        selectedUnit: teacherSelection.unit,
      }),
    );
  }, [availableUnits, teacherSelection.grade, teacherSelection.unit]);

  function toggleUnit(unit) {
    const cleanUnit = String(unit ?? "").trim();
    if (!cleanUnit || !availableUnits.includes(cleanUnit)) {
      return;
    }

    setSelectedUnits((current) => {
      const hasUnit = current.includes(cleanUnit);
      return sortTeacherBingoUnits(
        hasUnit
          ? current.filter((entry) => entry !== cleanUnit)
          : [...current, cleanUnit],
      );
    });
  }

  const items = useMemo(
    () =>
      buildTeacherBingoItemsFromCatalog(
        teacherCatalog,
        teacherSelection.grade,
        selectedUnits,
      ),
    [selectedUnits, teacherCatalog, teacherSelection.grade],
  );

  const boardSize = useMemo(() => {
    if (items.length < 9) {
      return 0;
    }

    return determineBingoBoardSize(items.length);
  }, [items.length]);

  const canStart = Boolean(
    teacherProfile?.userId &&
      teacherSelection.grade &&
      selectedUnits.length > 0 &&
      items.length >= 9,
  );

  async function prepareSession() {
    if (!isFirebaseConfigured || !teacherProfile || !userId) {
      throw new Error("Google 로그인과 선생님 정보 등록이 필요합니다.");
    }

    if (!teacherSelection.grade || selectedUnits.length === 0) {
      throw new Error("빙고에 사용할 학년과 단원을 먼저 선택하세요.");
    }

    const snapshot = teacherAutoSaveSnapshotRef.current;
    const currentUnitIncluded = selectedUnits.includes(
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
      selectedUnits,
    );

    if (mergedItems.length < 9) {
      throw new Error("빙고를 시작하려면 선택 단원에 단어가 9개 이상 있어야 합니다.");
    }

    return createTeacherBingoSessionDraft({
      teacherProfile,
      grade: teacherSelection.grade,
      publisher: teacherPublisherDraft,
      selectedUnits,
      items: mergedItems,
    });
  }

  const selectedUnitLabels = useMemo(
    () => buildTeacherBingoSelectedUnitLabels(selectedUnits),
    [selectedUnits],
  );

  return {
    availableUnits,
    selectedUnits,
    selectedUnitLabels,
    items,
    boardSize,
    canStart,
    toggleUnit,
    prepareSession,
  };
}
