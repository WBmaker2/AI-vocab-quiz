import test from "node:test";
import assert from "node:assert/strict";
import * as studentSetLoader from "./studentSetLoader.js";
import {
  buildStudentContexts,
  buildStudentMatchingItems,
  toggleStudentMatchingUnits,
} from "./studentSetLoader.js";

function commitWhenCurrent(gate, generation, commits, value) {
  if (gate.isCurrent(generation)) {
    commits.push(value);
  }
}

const asyncLanes = [
  "학교 검색",
  "선생님/단원 조회",
  "단어 세트 불러오기",
  "짝 맞추기 세트 불러오기",
];

test("request gate advances generations and invalidates older requests", () => {
  assert.equal(typeof studentSetLoader.createRequestGate, "function");

  const gate = studentSetLoader.createRequestGate();
  const firstGeneration = gate.begin();
  const secondGeneration = gate.begin();

  assert.notEqual(firstGeneration, secondGeneration);
  assert.equal(gate.isCurrent(firstGeneration), false);
  assert.equal(gate.isCurrent(secondGeneration), true);
});

for (const lane of asyncLanes) {
  test(`${lane}는 최신 요청의 성공, 오류, 로딩 종료만 반영한다`, () => {
    assert.equal(typeof studentSetLoader.createRequestGate, "function");

    const gate = studentSetLoader.createRequestGate();
    const staleGeneration = gate.begin();
    const currentGeneration = gate.begin();
    const commits = [];

    commitWhenCurrent(gate, staleGeneration, commits, "stale-success");
    commitWhenCurrent(gate, staleGeneration, commits, "stale-error");
    commitWhenCurrent(gate, staleGeneration, commits, "stale-loading-complete");
    commitWhenCurrent(gate, currentGeneration, commits, "current-success");
    commitWhenCurrent(gate, currentGeneration, commits, "current-error");
    commitWhenCurrent(
      gate,
      currentGeneration,
      commits,
      "current-loading-complete",
    );

    assert.deepEqual(commits, [
      "current-success",
      "current-error",
      "current-loading-complete",
    ]);
  });
}

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
