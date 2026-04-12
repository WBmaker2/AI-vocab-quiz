export function toggleStudentMatchingUnits(currentUnits, unit) {
  const cleanUnit = String(unit ?? "").trim();
  if (!cleanUnit) {
    return Array.isArray(currentUnits) ? [...currentUnits] : [];
  }

  const safeCurrentUnits = Array.isArray(currentUnits) ? currentUnits : [];
  const hasUnit = safeCurrentUnits.includes(cleanUnit);
  const nextUnits = hasUnit
    ? safeCurrentUnits.filter((entry) => entry !== cleanUnit)
    : [...safeCurrentUnits, cleanUnit];

  return nextUnits.sort((left, right) =>
    String(left).localeCompare(String(right), undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

export function buildStudentMatchingItems(unitItems) {
  return Array.from(
    new Map(
      (Array.isArray(unitItems) ? unitItems : [])
        .flat()
        .filter(
          (item) =>
            String(item.word ?? "").trim() && String(item.meaning ?? "").trim(),
        )
        .map((item) => [`${item.word}__${item.meaning}`, item]),
    ).values(),
  );
}

export function buildStudentContexts({
  selectedSchool,
  selectedTeacher,
  selection,
}) {
  return {
    leaderboardContext: {
      schoolId: selectedSchool?.id ?? "",
      schoolName: selectedSchool?.name ?? "",
      grade: selection?.grade ?? "",
    },
    progressionContext: {
      schoolId: selectedSchool?.id ?? "",
      schoolName: selectedSchool?.name ?? "",
      grade: selection?.grade ?? "",
      unit: selection?.unit ?? "",
      teacherUserId: selectedTeacher?.userId ?? "",
      teacherName: selectedTeacher?.teacherName ?? "",
    },
  };
}
