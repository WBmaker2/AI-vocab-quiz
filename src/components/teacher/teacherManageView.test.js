import test from "node:test";
import assert from "node:assert/strict";
import {
  formatTeacherCatalogEntrySummary,
  getTeacherManageAutoSaveToneClass,
  getTeacherManageStatusToneClass,
} from "./teacherManageView.js";

test("getTeacherManageStatusToneClass returns warning for failure messages", () => {
  assert.equal(getTeacherManageStatusToneClass("저장 실패"), "warning-hint");
});

test("getTeacherManageStatusToneClass defaults to success for non-failure messages", () => {
  assert.equal(getTeacherManageStatusToneClass("저장 완료"), "success-hint");
});

test("getTeacherManageAutoSaveToneClass returns success when save is mentioned", () => {
  assert.equal(getTeacherManageAutoSaveToneClass("자동 저장됨"), "success-hint");
});

test("formatTeacherCatalogEntrySummary includes publish state and publisher", () => {
  assert.equal(
    formatTeacherCatalogEntrySummary({
      published: true,
      publisher: "동아출판 윤여범",
    }),
    "현재 저장본: 공개됨 상태 · 동아출판 윤여범",
  );
});
