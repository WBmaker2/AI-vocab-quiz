import { getUnitsForGrade } from "../constants/vocabulary.js";

export const MAX_TEACHER_VOCABULARY_IMPORT_BATCH_OPERATIONS = 500;
export const TEACHER_VOCABULARY_IMPORT_PUBLISHER_OPERATION_COUNT = 1;

export function assertTeacherVocabularyImportBatchCapacity(unitCount) {
  const cleanUnitCount = Number(unitCount);

  if (!Number.isInteger(cleanUnitCount) || cleanUnitCount < 0) {
    throw new Error("엑셀 가져오기 단원 수가 올바르지 않습니다.");
  }

  const operationCount =
    cleanUnitCount + TEACHER_VOCABULARY_IMPORT_PUBLISHER_OPERATION_COUNT;

  if (operationCount > MAX_TEACHER_VOCABULARY_IMPORT_BATCH_OPERATIONS) {
    throw new Error("엑셀 가져오기는 한 번에 Firestore 배치 500개 작업을 넘길 수 없습니다.");
  }

  return operationCount;
}

export async function loadTeacherVocabularyImportExistingSets({
  units,
  loadExistingSet,
}) {
  const importUnits = Array.isArray(units) ? units : [];
  assertTeacherVocabularyImportBatchCapacity(importUnits.length);

  return Promise.all(
    importUnits.map(async (groupedSet) => ({
      groupedSet,
      existingSet: await loadExistingSet(groupedSet),
    })),
  );
}

export function tryStartTeacherWorkbookImport(importInFlightRef) {
  if (importInFlightRef.current) {
    return false;
  }

  importInFlightRef.current = true;
  return true;
}

export function finishTeacherWorkbookImport(importInFlightRef) {
  importInFlightRef.current = false;
}

export async function runTeacherSetLoad({
  revision,
  isCurrentRevision,
  loadSet,
  onSuccess,
  onError,
  onFinally,
}) {
  try {
    const result = await loadSet();
    if (isCurrentRevision(revision)) {
      await onSuccess?.(result);
    }

    return {
      ok: true,
      current: isCurrentRevision(revision),
      result,
    };
  } catch (error) {
    const current = isCurrentRevision(revision);
    if (current) {
      await onError?.(error);
    }

    return { ok: false, current, error };
  } finally {
    if (isCurrentRevision(revision)) {
      await onFinally?.();
    }
  }
}

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

export function shouldQueueTeacherAutoSave({
  autoSaveToken,
  dirty,
  saving,
  importing,
}) {
  return Boolean(autoSaveToken && dirty && !saving && !importing);
}

export function createTeacherAutoSaveRevisionState() {
  return { latestRevision: 0 };
}

export function createTeacherSetCatalogRefreshState() {
  return { latestRequest: 0 };
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

export function createTeacherSetSaveCoordinator({
  onSaveStart = () => {},
  onSaveSettled = () => {},
} = {}) {
  let inFlight = null;
  let queue = [];

  function resolveRequest(request, payload) {
    request.waiters.forEach(({ resolve }) => resolve(payload));
  }

  function rejectRequest(request, error) {
    request.waiters.forEach(({ reject }) => reject(error));
  }

  function runNext() {
    if (inFlight || queue.length === 0) {
      return;
    }

    const request = queue.shift();
    inFlight = request;

    if (request.type === "save") {
      onSaveStart({ revision: request.revision });
    }

    Promise.resolve()
      .then(() => request.run())
      .then((result) => {
        resolveRequest(request, {
          revision: request.revision,
          result,
        });
      })
      .catch((error) => {
        rejectRequest(request, error);
      })
      .finally(() => {
        inFlight = null;
        if (request.type === "save") {
          onSaveSettled({ revision: request.revision });
        }
        runNext();
      });
  }

  function enqueue({ revision, snapshot, sourceType, persistSnapshot }) {
    return new Promise((resolve, reject) => {
      const waiter = { resolve, reject };

      if (inFlight?.type === "save" && inFlight.revision === revision) {
        inFlight.waiters.push(waiter);
        return;
      }

      const pendingSave = queue.at(-1);
      if (pendingSave?.type === "save") {
        if (revision < pendingSave.revision) {
          pendingSave.waiters.push(waiter);
          return;
        }

        if (revision === pendingSave.revision) {
          pendingSave.snapshot = snapshot;
          pendingSave.sourceType = sourceType;
          pendingSave.persistSnapshot = persistSnapshot;
          pendingSave.run = () => persistSnapshot(snapshot, sourceType);
          pendingSave.waiters.push(waiter);
          return;
        }

        queue[queue.length - 1] = {
          type: "save",
          revision,
          snapshot,
          sourceType,
          persistSnapshot,
          run: () => persistSnapshot(snapshot, sourceType),
          waiters: [...pendingSave.waiters, waiter],
        };
        return;
      }

      if (inFlight && revision < inFlight.revision) {
        resolve({ revision, skipped: true });
        return;
      }

      queue.push({
        type: "save",
        revision,
        snapshot,
        sourceType,
        persistSnapshot,
        run: () => persistSnapshot(snapshot, sourceType),
        waiters: [waiter],
      });
      runNext();
    });
  }

  function enqueueMutation({ revision, runMutation }) {
    return new Promise((resolve, reject) => {
      queue.push({
        type: "mutation",
        revision,
        run: runMutation,
        waiters: [{ resolve, reject }],
      });
      runNext();
    });
  }

  function discardPendingBefore(revision) {
    const lastMutationIndex = queue.findLastIndex(
      (request) => request.type === "mutation",
    );

    queue = queue.filter((request, index) => {
      if (index <= lastMutationIndex) {
        return true;
      }

      if (request.type !== "save" || request.revision >= revision) {
        return true;
      }

      resolveRequest(request, {
        revision: request.revision,
        skipped: true,
      });
      return false;
    });
  }

  return {
    enqueue,
    enqueueMutation,
    discardPendingBefore,
  };
}

export async function refreshTeacherSetCatalog({
  loadCatalog,
  revision = null,
  isCurrentRevision = () => true,
  refreshState = createTeacherSetCatalogRefreshState(),
  setLoading,
  setCatalog,
  setError,
}) {
  const request = ++refreshState.latestRequest;
  setLoading(true);

  try {
    const catalog = await loadCatalog();
    if (revision !== null && !isCurrentRevision(revision)) {
      return false;
    }

    setCatalog(catalog);
    return true;
  } catch (error) {
    if (revision !== null && !isCurrentRevision(revision)) {
      return false;
    }

    setError(error);
    return false;
  } finally {
    if (refreshState.latestRequest === request) {
      setLoading(false);
    }
  }
}

export async function completeTeacherSetImport({
  refreshCatalog,
  revision,
  isCurrentRevision,
  applyImportResult,
}) {
  await refreshCatalog();

  if (!isCurrentRevision(revision)) {
    return false;
  }

  applyImportResult();
  return true;
}
