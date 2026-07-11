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

export function createTeacherSetSaveCoordinator({
  onSaveStart = () => {},
  onSaveSettled = () => {},
} = {}) {
  let inFlight = null;
  let pending = null;

  function resolveRequest(request, payload) {
    request.waiters.forEach(({ resolve }) => resolve(payload));
  }

  function rejectRequest(request, error) {
    request.waiters.forEach(({ reject }) => reject(error));
  }

  function runNext() {
    if (inFlight || !pending) {
      return;
    }

    inFlight = pending;
    pending = null;
    onSaveStart({ revision: inFlight.revision });

    Promise.resolve()
      .then(() =>
        inFlight.persistSnapshot(inFlight.snapshot, inFlight.sourceType),
      )
      .then((result) => {
        resolveRequest(inFlight, {
          revision: inFlight.revision,
          result,
        });
      })
      .catch((error) => {
        rejectRequest(inFlight, error);
      })
      .finally(() => {
        const settledRequest = inFlight;
        inFlight = null;
        onSaveSettled({ revision: settledRequest.revision });
        runNext();
      });
  }

  function enqueue({ revision, snapshot, sourceType, persistSnapshot }) {
    return new Promise((resolve, reject) => {
      const waiter = { resolve, reject };

      if (inFlight?.revision === revision) {
        inFlight.waiters.push(waiter);
        return;
      }

      if (pending) {
        if (revision < pending.revision) {
          pending.waiters.push(waiter);
          return;
        }

        if (revision === pending.revision) {
          pending.snapshot = snapshot;
          pending.sourceType = sourceType;
          pending.persistSnapshot = persistSnapshot;
          pending.waiters.push(waiter);
          return;
        }

        pending = {
          revision,
          snapshot,
          sourceType,
          persistSnapshot,
          waiters: [...pending.waiters, waiter],
        };
        return;
      }

      if (inFlight && revision < inFlight.revision) {
        resolve({ revision, skipped: true });
        return;
      }

      pending = {
        revision,
        snapshot,
        sourceType,
        persistSnapshot,
        waiters: [waiter],
      };
      runNext();
    });
  }

  function discardPendingBefore(revision) {
    if (!pending || pending.revision >= revision) {
      return;
    }

    const discardedRequest = pending;
    pending = null;
    resolveRequest(discardedRequest, {
      revision: discardedRequest.revision,
      skipped: true,
    });
  }

  return {
    enqueue,
    discardPendingBefore,
  };
}
