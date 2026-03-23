function sortUnits(units) {
  return [...units].sort((left, right) =>
    String(left).localeCompare(String(right), undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

export function groupPublisherSourcesByTeacherAndSchool(entries, currentSchoolId = "") {
  const grouped = new Map();

  entries.forEach((entry) => {
    const ownerUid = String(entry.ownerUid ?? "").trim();
    const schoolId = String(entry.schoolId ?? "").trim();
    const schoolName = String(entry.schoolName ?? "").trim();
    const teacherName = String(entry.teacherName ?? "").trim();
    const grade = String(entry.grade ?? "").trim();
    const unit = String(entry.unit ?? "").trim();
    const publisher = String(entry.publisher ?? "").trim();
    const itemCount = Array.isArray(entry.items) ? entry.items.length : 0;

    if (!ownerUid || !schoolId || !schoolName || !teacherName || !grade || !publisher) {
      return;
    }

    const key = `${schoolId}__${ownerUid}__${grade}__${publisher}`;
    const current = grouped.get(key) ?? {
      id: key,
      ownerUid,
      schoolId,
      schoolName,
      teacherName,
      grade,
      publisher,
      isCurrentSchool:
        schoolId === String(currentSchoolId ?? "").trim(),
      units: [],
      itemCount: 0,
    };

    current.units.push(unit);
    current.itemCount += itemCount;
    grouped.set(key, current);
  });

  return Array.from(grouped.values())
    .map((entry) => ({
      ...entry,
      units: sortUnits(Array.from(new Set(entry.units))),
    }))
    .sort((left, right) => {
      const schoolCompare = left.schoolName.localeCompare(right.schoolName, undefined, {
        sensitivity: "base",
      });
      if (schoolCompare !== 0) {
        return schoolCompare;
      }

      return left.teacherName.localeCompare(right.teacherName, undefined, {
        sensitivity: "base",
      });
    });
}

export function summarizePublisherCopyResult({
  savedUnitCount,
  addedVocabularyCount,
  duplicateVocabularyCount,
}) {
  return `${savedUnitCount}개 단원을 복사해 새 단어 ${addedVocabularyCount}개를 추가했고, 중복 ${duplicateVocabularyCount}개는 건너뛰었습니다.`;
}
