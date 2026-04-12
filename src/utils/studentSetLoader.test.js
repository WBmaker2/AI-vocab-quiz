import test from "node:test";
import assert from "node:assert/strict";
import {
  buildStudentContexts,
  buildStudentMatchingItems,
  toggleStudentMatchingUnits,
} from "./studentSetLoader.js";

test("toggleStudentMatchingUnits adds and sorts units numerically", () => {
  const nextUnits = toggleStudentMatchingUnits(["10", "1"], "2");

  assert.deepEqual(nextUnits, ["1", "2", "10"]);
});

test("toggleStudentMatchingUnits removes an already selected unit", () => {
  const nextUnits = toggleStudentMatchingUnits(["1", "2", "10"], "2");

  assert.deepEqual(nextUnits, ["1", "10"]);
});

test("buildStudentMatchingItems removes duplicates and blank entries", () => {
  const items = buildStudentMatchingItems([
    [
      { word: "apple", meaning: "사과" },
      { word: "banana", meaning: "바나나" },
    ],
    [
      { word: "apple", meaning: "사과", exampleSentence: "I like apples." },
      { word: "", meaning: "빈값" },
    ],
  ]);

  assert.deepEqual(items, [
    { word: "apple", meaning: "사과", exampleSentence: "I like apples." },
    { word: "banana", meaning: "바나나" },
  ]);
});

test("buildStudentContexts returns leaderboard and progression metadata", () => {
  const contexts = buildStudentContexts({
    selectedSchool: { id: "school-1", name: "테스트초" },
    selectedTeacher: { userId: "teacher-1", teacherName: "김선생님" },
    selection: { grade: "3", unit: "2" },
  });

  assert.deepEqual(contexts, {
    leaderboardContext: {
      schoolId: "school-1",
      schoolName: "테스트초",
      grade: "3",
    },
    progressionContext: {
      schoolId: "school-1",
      schoolName: "테스트초",
      grade: "3",
      unit: "2",
      teacherUserId: "teacher-1",
      teacherName: "김선생님",
    },
  });
});
