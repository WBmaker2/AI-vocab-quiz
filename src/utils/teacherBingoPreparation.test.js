import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTeacherBingoItemsFromCatalog,
  createTeacherBingoSessionDraft,
  deriveTeacherBingoUnits,
  saveTeacherBingoPreStartSet,
} from "./teacherBingoPreparation.js";
import {
  captureTeacherAutoSaveRevision,
  createTeacherAutoSaveRevisionState,
  createTeacherSetSaveCoordinator,
  isCurrentTeacherAutoSaveRevision,
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

test("deriveTeacherBingoUnits keeps only available units and sorts them", () => {
  const nextUnits = deriveTeacherBingoUnits({
    availableUnits: ["10", "2", "1"],
    currentUnits: ["10", "3", "1"],
    selectedUnit: "2",
  });

  assert.deepEqual(nextUnits, ["1", "10"]);
});

test("deriveTeacherBingoUnits seeds the currently selected unit when nothing valid remains", () => {
  const nextUnits = deriveTeacherBingoUnits({
    availableUnits: ["10", "2", "1"],
    currentUnits: [],
    selectedUnit: "2",
  });

  assert.deepEqual(nextUnits, ["2"]);
});

test("buildTeacherBingoItemsFromCatalog merges selected units and removes duplicate word pairs", () => {
  const items = buildTeacherBingoItemsFromCatalog(
    [
      {
        grade: "3",
        unit: "1",
        items: [
          { word: "apple", meaning: "사과" },
          { word: "banana", meaning: "바나나" },
        ],
      },
      {
        grade: "3",
        unit: "2",
        items: [
          { word: "apple", meaning: "사과", exampleSentence: "I like apples." },
          { word: "cat", meaning: "고양이" },
        ],
      },
    ],
    "3",
    ["2", "1"],
  );

  assert.deepEqual(
    items.map((item) => ({
      word: item.word,
      meaning: item.meaning,
      exampleSentence: item.exampleSentence,
      order: item.order,
    })),
    [
      { word: "apple", meaning: "사과", exampleSentence: "I like apples.", order: 1 },
      { word: "cat", meaning: "고양이", exampleSentence: "", order: 2 },
      { word: "banana", meaning: "바나나", exampleSentence: "", order: 3 },
    ],
  );
});

test("createTeacherBingoSessionDraft includes labels and board size", () => {
  const draft = createTeacherBingoSessionDraft({
    teacherProfile: {
      userId: "teacher-1",
      teacherName: "김선생님",
      schoolId: "school-1",
      schoolName: "테스트초",
    },
    grade: "3",
    publisher: "동아출판 윤여범",
    selectedUnits: ["1", "2"],
    items: Array.from({ length: 10 }, (_, index) => ({
      word: `word-${index + 1}`,
      meaning: `뜻-${index + 1}`,
    })),
  });

  assert.equal(draft.unit, "1");
  assert.deepEqual(draft.selectedUnitLabels, ["1단원", "2단원"]);
  assert.equal(draft.boardSize, 3);
  assert.equal(draft.items.length, 10);
});

test("bingo pre-start save cannot mark a newer edit clean", async () => {
  const revisionState = createTeacherAutoSaveRevisionState();
  const coordinator = createTeacherSetSaveCoordinator();
  const pendingSave = createDeferred();
  let dirty = true;
  let autoSaveStatus = "";

  const revision = recordTeacherAutoSaveEdit(revisionState);
  const savePromise = saveTeacherBingoPreStartSet({
    snapshot: { items: ["A"] },
    revision,
    queueTeacherSetSave: (snapshot, sourceType, saveRevision) =>
      coordinator.enqueue({
        snapshot,
        sourceType,
        revision: saveRevision,
        persistSnapshot: () => pendingSave.promise,
      }),
    isCurrentRevision: (saveRevision) =>
      isCurrentTeacherAutoSaveRevision(revisionState, saveRevision),
    setDirty: (nextDirty) => {
      dirty = nextDirty;
    },
    setAutoSaveStatus: (nextStatus) => {
      autoSaveStatus = nextStatus;
    },
  });
  await flushCoordinator();

  recordTeacherAutoSaveEdit(revisionState);
  autoSaveStatus = "자동 저장 예약 중";
  pendingSave.resolve({ cleanPublisher: "publisher-a" });

  const saved = await savePromise;

  assert.equal(saved, false);
  assert.equal(dirty, true);
  assert.equal(autoSaveStatus, "자동 저장 예약 중");
  assert.equal(captureTeacherAutoSaveRevision(revisionState), 2);
});
