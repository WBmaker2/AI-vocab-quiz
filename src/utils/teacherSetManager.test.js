import test from "node:test";
import assert from "node:assert/strict";
import {
  canAutoSaveTeacherSet,
  getNextTeacherSelection,
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
