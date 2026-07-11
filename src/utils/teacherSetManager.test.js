import test from "node:test";
import assert from "node:assert/strict";
import {
  canAutoSaveTeacherSet,
  captureTeacherAutoSaveRevision,
  createTeacherAutoSaveRevisionState,
  createTeacherSetSaveCoordinator,
  getNextTeacherSelection,
  isCurrentTeacherAutoSaveRevision,
  ownsTeacherAutoSaveTimer,
  recordTeacherAutoSaveEdit,
} from "./teacherSetManager.js";

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

async function flushCoordinator() {
  await Promise.resolve();
  await Promise.resolve();
}

test("getNextTeacherSelection keeps other fields for non-grade updates", () => {
  const nextSelection = getNextTeacherSelection({
    currentSelection: { grade: "3", unit: "2" },
    field: "unit",
    value: "5",
    teacherCatalog: [],
  });

  assert.deepEqual(nextSelection, { grade: "3", unit: "5" });
});

test("getNextTeacherSelection seeds the first available unit when grade changes", () => {
  const nextSelection = getNextTeacherSelection({
    currentSelection: { grade: "3", unit: "2" },
    field: "grade",
    value: "4",
    teacherCatalog: [
      { grade: "4", unit: "10" },
      { grade: "4", unit: "2" },
      { grade: "3", unit: "8" },
    ],
  });

  assert.deepEqual(nextSelection, { grade: "4", unit: "2" });
});

test("canAutoSaveTeacherSet returns true only when the snapshot is complete and idle", () => {
  assert.equal(
    canAutoSaveTeacherSet({
      userId: "teacher-1",
      profile: { userId: "teacher-1" },
      selection: { grade: "3", unit: "2" },
      publisher: "동아출판 윤여범",
      dirty: true,
      loading: false,
      saving: false,
      importing: false,
      copying: false,
    }),
    true,
  );

  assert.equal(
    canAutoSaveTeacherSet({
      userId: "teacher-1",
      profile: { userId: "teacher-1" },
      selection: { grade: "3", unit: "2" },
      publisher: "",
      dirty: true,
      loading: false,
      saving: false,
      importing: false,
      copying: false,
    }),
    false,
  );
});

test("an older autosave completion cannot clear a newer timer or mark its edit clean", () => {
  const revisionState = createTeacherAutoSaveRevisionState();
  const timerA = { id: "timer-a" };
  const timerB = { id: "timer-b" };
  let currentTimer = timerA;
  let dirty = true;
  let autoSaveStatus = "자동 저장 예약 중";

  recordTeacherAutoSaveEdit(revisionState);
  const saveARevision = captureTeacherAutoSaveRevision(revisionState);

  recordTeacherAutoSaveEdit(revisionState);
  const saveBRevision = captureTeacherAutoSaveRevision(revisionState);
  currentTimer = timerB;

  if (ownsTeacherAutoSaveTimer(currentTimer, timerA)) {
    currentTimer = null;
  }

  if (isCurrentTeacherAutoSaveRevision(revisionState, saveARevision)) {
    dirty = false;
    autoSaveStatus = "자동 저장됨";
  }

  assert.equal(currentTimer, timerB);
  assert.equal(dirty, true);
  assert.equal(autoSaveStatus, "자동 저장 예약 중");
  assert.equal(isCurrentTeacherAutoSaveRevision(revisionState, saveBRevision), true);
});

test("a stale autosave failure leaves the newer edit status unchanged", () => {
  const revisionState = createTeacherAutoSaveRevisionState();
  let autoSaveStatus = "자동 저장 예약 중";
  let error = "";

  recordTeacherAutoSaveEdit(revisionState);
  const saveARevision = captureTeacherAutoSaveRevision(revisionState);
  recordTeacherAutoSaveEdit(revisionState);

  if (isCurrentTeacherAutoSaveRevision(revisionState, saveARevision)) {
    autoSaveStatus = "자동 저장 실패";
    error = "단어 세트를 자동 저장하지 못했습니다.";
  }

  assert.equal(autoSaveStatus, "자동 저장 예약 중");
  assert.equal(error, "");
});

test("serializes a newer save until the older remote write settles", async () => {
  const revisionState = createTeacherAutoSaveRevisionState();
  const coordinator = createTeacherSetSaveCoordinator();
  const firstSave = createDeferred();
  const secondSave = createDeferred();
  const remoteCalls = [];

  const revisionA = recordTeacherAutoSaveEdit(revisionState);
  const saveA = coordinator.enqueue({
    revision: revisionA,
    snapshot: { items: ["A"] },
    sourceType: "autosave",
    persistSnapshot: async (snapshot) => {
      remoteCalls.push(snapshot);
      return firstSave.promise;
    },
  });
  await flushCoordinator();

  const revisionB = recordTeacherAutoSaveEdit(revisionState);
  const saveB = coordinator.enqueue({
    revision: revisionB,
    snapshot: { items: ["B"] },
    sourceType: "autosave",
    persistSnapshot: async (snapshot) => {
      remoteCalls.push(snapshot);
      return secondSave.promise;
    },
  });

  assert.deepEqual(remoteCalls, [{ items: ["A"] }]);

  firstSave.resolve({ cleanPublisher: "publisher-a" });
  await saveA;
  await flushCoordinator();

  assert.deepEqual(remoteCalls, [{ items: ["A"] }, { items: ["B"] }]);

  secondSave.resolve({ cleanPublisher: "publisher-b" });
  await saveB;
});

test("a stale remote completion cannot clean a newer queued edit", async () => {
  const revisionState = createTeacherAutoSaveRevisionState();
  const coordinator = createTeacherSetSaveCoordinator();
  const firstSave = createDeferred();
  const secondSave = createDeferred();
  let dirty = true;
  let autoSaveStatus = "자동 저장 중...";

  const revisionA = recordTeacherAutoSaveEdit(revisionState);
  const saveA = coordinator.enqueue({
    revision: revisionA,
    snapshot: { items: ["A"] },
    sourceType: "autosave",
    persistSnapshot: () => firstSave.promise,
  });
  await flushCoordinator();

  const revisionB = recordTeacherAutoSaveEdit(revisionState);
  coordinator.enqueue({
    revision: revisionB,
    snapshot: { items: ["B"] },
    sourceType: "autosave",
    persistSnapshot: () => secondSave.promise,
  });
  autoSaveStatus = "자동 저장 예약 중";

  firstSave.resolve({ cleanPublisher: "publisher-a" });
  await saveA;

  if (isCurrentTeacherAutoSaveRevision(revisionState, revisionA)) {
    dirty = false;
    autoSaveStatus = "자동 저장됨";
  }

  assert.equal(dirty, true);
  assert.equal(autoSaveStatus, "자동 저장 예약 중");

  secondSave.resolve({ cleanPublisher: "publisher-b" });
  await flushCoordinator();
});

test("manual save captures the current revision and shares the serialized queue", async () => {
  const revisionState = createTeacherAutoSaveRevisionState();
  const coordinator = createTeacherSetSaveCoordinator();
  const firstSave = createDeferred();
  const secondSave = createDeferred();
  const remoteCalls = [];

  const revisionA = recordTeacherAutoSaveEdit(revisionState);
  const saveA = coordinator.enqueue({
    revision: revisionA,
    snapshot: { items: ["A"] },
    sourceType: "autosave",
    persistSnapshot: async (snapshot) => {
      remoteCalls.push(snapshot);
      return firstSave.promise;
    },
  });
  await flushCoordinator();

  recordTeacherAutoSaveEdit(revisionState);
  const manualRevision = captureTeacherAutoSaveRevision(revisionState);
  const manualSave = coordinator.enqueue({
    revision: manualRevision,
    snapshot: { items: ["B"] },
    sourceType: "manual",
    persistSnapshot: async (snapshot) => {
      remoteCalls.push(snapshot);
      return secondSave.promise;
    },
  });

  assert.equal(manualRevision, 2);
  assert.equal(revisionState.latestRevision, 2);

  firstSave.resolve({ cleanPublisher: "publisher-a" });
  await saveA;
  await flushCoordinator();

  assert.deepEqual(remoteCalls, [{ items: ["A"] }, { items: ["B"] }]);

  secondSave.resolve({ cleanPublisher: "publisher-b" });
  await manualSave;
});
