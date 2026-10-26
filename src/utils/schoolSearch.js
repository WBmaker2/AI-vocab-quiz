export function normalizeSchoolSearchName(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function createSchoolSearchRange(normalized) {
  const start = String(normalized ?? "").trim();

  if (!start) {
    return null;
  }

  return {
    start,
    end: `${start}\uf8ff`,
  };
}
