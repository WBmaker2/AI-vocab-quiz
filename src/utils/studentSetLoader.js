export function createRequestGate() {
  let currentGeneration = 0;

  return {
    begin() {
      currentGeneration += 1;
      return currentGeneration;
    },
    isCurrent(generation) {
      return generation === currentGeneration;
    },
  };
}

export function invalidateMatchingLane(matchingGate) {
  return matchingGate.begin();
}

export async function runLatestRequest(
  gate,
  request,
  { onSuccess, onError, onFinally } = {},
) {
  const generation = gate.begin();
  const isCurrent = () => gate.isCurrent(generation);
  let result;

  try {
    const value = await request();
    if (isCurrent()) {
      await onSuccess?.(value, { generation, isCurrent });
    }
    result = { ok: true, current: isCurrent(), value };
  } catch (error) {
    if (isCurrent()) {
      await onError?.(error, { generation, isCurrent });
    }
    result = { ok: false, current: isCurrent(), error };
  } finally {
    if (isCurrent()) {
      await onFinally?.({ generation, isCurrent });
    }
  }

  return result;
}

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
