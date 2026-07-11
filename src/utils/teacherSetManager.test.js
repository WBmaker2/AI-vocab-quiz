import test from "node:test";
import assert from "node:assert/strict";
import {
  canAutoSaveTeacherSet,
  captureTeacherAutoSaveRevision,
  createTeacherAutoSaveRevisionState,
  getNextTeacherSelection,
  isCurrentTeacherAutoSaveRevision,
  ownsTeacherAutoSaveTimer,
  recordTeacherAutoSaveEdit,
} from "./teacherSetManager.js";

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
