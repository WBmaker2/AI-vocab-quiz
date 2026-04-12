function normalizeValue(value) {
  return String(value ?? "").trim();
}

function buildRecentSelectionKey({ schoolId, teacherUserId }) {
  const cleanSchoolId = normalizeValue(schoolId);
  const cleanTeacherUserId = normalizeValue(teacherUserId);

  if (!cleanSchoolId || !cleanTeacherUserId) {
    return "";
  }

  return `${cleanSchoolId}::${cleanTeacherUserId}`;
}

function normalizeRecentSelection(selection) {
  const schoolId = normalizeValue(selection?.schoolId);
  const teacherUserId = normalizeValue(selection?.teacherUserId);
  const grade = normalizeValue(selection?.grade);
  const unit = normalizeValue(selection?.unit);

  if (!schoolId || !teacherUserId || !grade) {
    return null;
  }

  return {
    schoolId,
    teacherUserId,
    grade,
    unit,
  };
}

function parseRecentSelections(rawValue) {
  if (!rawValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function readStudentRecentSelection(rawValue, keyParts) {
  const key = buildRecentSelectionKey(keyParts);
  if (!key) {
    return null;
  }

  const store = parseRecentSelections(rawValue);
  return normalizeRecentSelection(store[key]);
}

export function upsertStudentRecentSelection(rawValue, selection) {
  const normalizedSelection = normalizeRecentSelection(selection);
  const store = parseRecentSelections(rawValue);

  if (!normalizedSelection) {
    return JSON.stringify(store);
  }

  const key = buildRecentSelectionKey(normalizedSelection);
  if (!key) {
    return JSON.stringify(store);
  }

  store[key] = normalizedSelection;
  return JSON.stringify(store);
}

export function resolveStudentRecentSelection({
  defaultSelection,
  recentSelection,
  availableGrades,
  availableUnits,
}) {
  const fallbackSelection = {
    grade: normalizeValue(defaultSelection?.grade),
    unit: normalizeValue(defaultSelection?.unit),
  };
  const safeGrades = Array.isArray(availableGrades)
    ? availableGrades.map((grade) => normalizeValue(grade)).filter(Boolean)
    : [];
  const safeUnits = Array.isArray(availableUnits)
    ? availableUnits.map((unit) => normalizeValue(unit)).filter(Boolean)
    : [];
  const recentGrade = normalizeValue(recentSelection?.grade);

  if (!recentGrade || !safeGrades.includes(recentGrade)) {
    return fallbackSelection;
  }

  const recentUnit = normalizeValue(recentSelection?.unit);

  return {
    grade: recentGrade,
    unit: safeUnits.includes(recentUnit) ? recentUnit : "",
  };
}
