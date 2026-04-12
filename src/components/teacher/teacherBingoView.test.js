import test from "node:test";
import assert from "node:assert/strict";
import {
  getTeacherBingoBoardLabel,
  getTeacherBingoSelectedUnits,
  getTeacherBingoAvailableUnits,
} from "./teacherBingoView.js";

test("getTeacherBingoBoardLabel returns a square label when board size exists", () => {
  assert.equal(getTeacherBingoBoardLabel(4), "4x4");
});

test("getTeacherBingoBoardLabel falls back when there are not enough words", () => {
  assert.equal(getTeacherBingoBoardLabel(0), "단어 부족");
});

test("getTeacherBingoAvailableUnits falls back to teacher units", () => {
  assert.deepEqual(
    getTeacherBingoAvailableUnits(undefined, ["1", "2"]),
    ["1", "2"],
  );
});

test("getTeacherBingoSelectedUnits returns an empty list when bingo state is missing", () => {
  assert.deepEqual(getTeacherBingoSelectedUnits(undefined), []);
});
