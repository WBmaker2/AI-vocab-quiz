import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_STUDENT_SELECTION } from "../constants/vocabulary.js";
import {
  readStudentRecentSelection,
  resolveStudentRecentSelection,
  upsertStudentRecentSelection,
} from "./studentRecentSelection.js";

test("upsertStudentRecentSelection stores and reads the latest selection per school and teacher", () => {
  let rawValue = "";

  rawValue = upsertStudentRecentSelection(rawValue, {
    schoolId: "school-a",
    teacherUserId: "teacher-1",
    grade: "5",
    unit: "2",
  });
  rawValue = upsertStudentRecentSelection(rawValue, {
    schoolId: "school-a",
    teacherUserId: "teacher-2",
    grade: "4",
    unit: "6",
  });

  assert.deepEqual(
    readStudentRecentSelection(rawValue, {
      schoolId: "school-a",
      teacherUserId: "teacher-1",
    }),
    {
      schoolId: "school-a",
      teacherUserId: "teacher-1",
      grade: "5",
      unit: "2",
    },
  );
  assert.deepEqual(
    readStudentRecentSelection(rawValue, {
      schoolId: "school-a",
      teacherUserId: "teacher-2",
    }),
    {
      schoolId: "school-a",
      teacherUserId: "teacher-2",
      grade: "4",
      unit: "6",
    },
  );
});

test("resolveStudentRecentSelection restores the saved grade and unit when both are still valid", () => {
  assert.deepEqual(
    resolveStudentRecentSelection({
      defaultSelection: DEFAULT_STUDENT_SELECTION,
      recentSelection: {
        schoolId: "school-a",
        teacherUserId: "teacher-1",
        grade: "5",
        unit: "2",
      },
      availableGrades: ["3", "4", "5", "6"],
      availableUnits: ["1", "2", "3"],
    }),
    {
      grade: "5",
      unit: "2",
    },
  );
});

test("resolveStudentRecentSelection keeps the restored grade but clears the unit when that unit is no longer available", () => {
  assert.deepEqual(
    resolveStudentRecentSelection({
      defaultSelection: DEFAULT_STUDENT_SELECTION,
      recentSelection: {
        schoolId: "school-a",
        teacherUserId: "teacher-1",
        grade: "5",
        unit: "2",
      },
      availableGrades: ["3", "4", "5", "6"],
      availableUnits: ["1", "4"],
    }),
    {
      grade: "5",
      unit: "",
    },
  );
});

test("resolveStudentRecentSelection falls back to the default selection when the saved grade is not allowed", () => {
  assert.deepEqual(
    resolveStudentRecentSelection({
      defaultSelection: DEFAULT_STUDENT_SELECTION,
      recentSelection: {
        schoolId: "school-a",
        teacherUserId: "teacher-1",
        grade: "2",
        unit: "8",
      },
      availableGrades: ["3", "4", "5", "6"],
      availableUnits: ["1", "2"],
    }),
    DEFAULT_STUDENT_SELECTION,
  );
});
