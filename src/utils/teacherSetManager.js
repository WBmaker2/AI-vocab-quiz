import { getUnitsForGrade } from "../constants/vocabulary.js";

export function getNextTeacherSelection({
  currentSelection,
  field,
  value,
  teacherCatalog,
}) {
  if (field === "grade") {
    const nextGrade = String(value ?? "").trim();
    const nextUnits = getUnitsForGrade(teacherCatalog ?? [], nextGrade);

    return {
      ...currentSelection,
      grade: nextGrade,
      unit: nextUnits[0] ?? "",
    };
  }

  return {
    ...currentSelection,
    [field]: value,
  };
}

export function canAutoSaveTeacherSet(snapshot, remoteConfigured = true) {
  const cleanPublisher = String(snapshot?.publisher ?? "").trim();

  return Boolean(
    remoteConfigured &&
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

export function createTeacherAutoSaveRevisionState() {
  return { latestRevision: 0 };
}

export function recordTeacherAutoSaveEdit(revisionState) {
  revisionState.latestRevision += 1;
  return revisionState.latestRevision;
}

export function captureTeacherAutoSaveRevision(revisionState) {
  return revisionState.latestRevision;
}

export function isCurrentTeacherAutoSaveRevision(revisionState, revision) {
  return revisionState.latestRevision === revision;
}

export function ownsTeacherAutoSaveTimer(currentTimer, timer) {
  return currentTimer === timer;
}
