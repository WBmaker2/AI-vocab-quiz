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

export function createExclusiveRequestGuard() {
  let activeOwner = null;

  return {
    acquire(owner) {
      if (activeOwner !== null) {
        return false;
      }

      activeOwner = owner;
      return true;
    },
    release(owner) {
      if (activeOwner !== owner) {
        return false;
      }

      activeOwner = null;
      return true;
    },
    isBusy() {
      return activeOwner !== null;
    },
  };
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

export async function runExclusiveRequest(
  guard,
  owner,
  gate,
  request,
  { onStart, onSuccess, onError, onFinally } = {},
) {
  if (!guard.acquire(owner)) {
    return { ok: false, current: false, blocked: true };
  }

  try {
    onStart?.();
    return await runLatestRequest(gate, request, {
      onSuccess,
      onError,
      onFinally,
    });
  } finally {
    guard.release(owner);
  }
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
