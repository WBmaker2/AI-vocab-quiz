import test from "node:test";
import assert from "node:assert/strict";
import {
  formatTeacherCopySourceGradeUnits,
  getTeacherBulkImportFileLabel,
  isTeacherBulkCopyDisabled,
} from "./teacherBulkView.js";

test("getTeacherBulkImportFileLabel returns an empty string when no file is selected", () => {
  assert.equal(getTeacherBulkImportFileLabel(null), "");
});

test("getTeacherBulkImportFileLabel returns the selected filename", () => {
  assert.equal(
    getTeacherBulkImportFileLabel({ name: "grade-3.xlsx" }),
    "선택한 파일: grade-3.xlsx",
  );
});

test("formatTeacherCopySourceGradeUnits renders grade and unit summary", () => {
  assert.equal(
    formatTeacherCopySourceGradeUnits({ grade: "3", units: ["1", "2"] }),
    "3학년 · 1, 2단원",
  );
});

test("isTeacherBulkCopyDisabled is true when nothing is selected", () => {
  assert.equal(isTeacherBulkCopyDisabled("", false), true);
});
