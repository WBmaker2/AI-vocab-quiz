export function getTeacherBulkImportFileLabel(importFile) {
  return importFile?.name ? `선택한 파일: ${importFile.name}` : "";
}

export function formatTeacherCopySourceGradeUnits(source) {
  return `${source.grade}학년 · ${source.units.join(", ")}단원`;
}

export function isTeacherBulkCopyDisabled(selectedCopySourceId, copying) {
  return !selectedCopySourceId || copying;
}
