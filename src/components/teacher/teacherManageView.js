export function getTeacherManageStatusToneClass(status) {
  return typeof status === "string" && status.includes("실패")
    ? "warning-hint"
    : "success-hint";
}

export function getTeacherManageAutoSaveToneClass(autoSaveStatus) {
  if (typeof autoSaveStatus !== "string" || !autoSaveStatus) {
    return "";
  }

  if (autoSaveStatus.includes("실패")) {
    return "warning-hint";
  }

  if (autoSaveStatus.includes("저장")) {
    return "success-hint";
  }

  return "";
}

export function formatTeacherCatalogEntrySummary(catalogEntry) {
  if (!catalogEntry) {
    return "";
  }

  return `현재 저장본: ${catalogEntry.published ? "공개됨" : "비공개"} 상태${
    catalogEntry.publisher ? ` · ${catalogEntry.publisher}` : ""
  }`;
}
