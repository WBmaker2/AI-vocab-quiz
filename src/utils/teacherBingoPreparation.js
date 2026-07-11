import { normalizeDraftVocabulary } from "../constants/vocabulary.js";
import { determineBingoBoardSize } from "./bingo.js";
import { mergeVocabularyItems } from "./vocabularyMerge.js";

export function sortTeacherBingoUnits(units) {
  return Array.from(
    new Set(
      (Array.isArray(units) ? units : [])
        .map((unit) => String(unit ?? "").trim())
        .filter(Boolean),
    ),
  ).sort((left, right) =>
    String(left).localeCompare(String(right), undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

export function deriveTeacherBingoUnits({
  availableUnits,
  currentUnits,
  selectedUnit,
}) {
  const normalizedAvailableUnits = sortTeacherBingoUnits(availableUnits);

  if (normalizedAvailableUnits.length === 0) {
    return [];
  }

  const normalizedCurrentUnits = sortTeacherBingoUnits(currentUnits).filter((unit) =>
    normalizedAvailableUnits.includes(unit),
  );

  if (normalizedCurrentUnits.length > 0) {
    return normalizedCurrentUnits;
  }

  const seededUnit = normalizedAvailableUnits.includes(
    String(selectedUnit ?? "").trim(),
  )
    ? String(selectedUnit ?? "").trim()
    : normalizedAvailableUnits[0];

  return seededUnit ? [seededUnit] : [];
}

export function buildTeacherBingoItemsFromCatalog(catalog, grade, selectedUnits) {
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

export function buildTeacherBingoSelectedUnitLabels(selectedUnits) {
  return (Array.isArray(selectedUnits) ? selectedUnits : []).map(
    (unit) => `${unit}단원`,
  );
}

export function createTeacherBingoSessionDraft({
  teacherProfile,
  grade,
  publisher,
  selectedUnits,
  items,
}) {
  return {
    teacherUserId: teacherProfile.userId,
    teacherName: teacherProfile.teacherName,
    schoolId: teacherProfile.schoolId,
    schoolName: teacherProfile.schoolName,
    grade,
    unit: selectedUnits[0],
    publisher,
    selectedUnits,
    selectedUnitLabels: buildTeacherBingoSelectedUnitLabels(selectedUnits),
    items,
    boardSize: determineBingoBoardSize(items.length),
  };
}

export async function saveTeacherBingoPreStartSet({
  snapshot,
  revision,
  queueTeacherSetSave,
  isCurrentRevision,
  setDirty,
  setAutoSaveStatus,
}) {
  setAutoSaveStatus("빙고 시작 전 자동 저장 중...");
  await queueTeacherSetSave(snapshot, "manual", revision);

  if (!isCurrentRevision(revision)) {
    return false;
  }

  setDirty(false);
  setAutoSaveStatus("자동 저장됨");
  return true;
}
