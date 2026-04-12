import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTeacherWorkspaceSummaryChips,
  getTeacherProfilePanelMode,
} from "./teacherWorkspaceView.js";

test("getTeacherProfilePanelMode keeps the profile card collapsed by default", () => {
  assert.equal(getTeacherProfilePanelMode(false), "collapsed");
});

test("getTeacherProfilePanelMode expands when the editor is opened", () => {
  assert.equal(getTeacherProfilePanelMode(true), "expanded");
});

test("buildTeacherWorkspaceSummaryChips turns the large summary cards into compact chips", () => {
  assert.deepEqual(
    buildTeacherWorkspaceSummaryChips({
      total: 18,
      withExamples: 7,
      published: true,
    }),
    [
      { id: "total", label: "등록 18개" },
      { id: "examples", label: "예문 7개" },
      { id: "published", label: "공개 ON" },
    ],
  );
});
