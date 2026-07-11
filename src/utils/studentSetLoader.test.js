import test from "node:test";
import assert from "node:assert/strict";
import * as studentSetLoader from "./studentSetLoader.js";
import {
  buildStudentContexts,
  buildStudentMatchingItems,
  toggleStudentMatchingUnits,
} from "./studentSetLoader.js";

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
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
  test(`${lane}는 production runner에서 최신 요청만 정산한다`, async () => {
    assert.equal(typeof studentSetLoader.runLatestRequest, "function");
    if (typeof studentSetLoader.runLatestRequest !== "function") {
      return;
    }

    const gate = studentSetLoader.createRequestGate();
    const events = [];
    const staleSuccess = createDeferred();
    const staleError = createDeferred();
    const currentSuccess = createDeferred();
    const run = studentSetLoader.runLatestRequest;
    const staleSuccessRun = run(
      gate,
      () => staleSuccess.promise,
      {
        onSuccess: () => events.push(`${lane}:stale-success`),
        onError: () => events.push(`${lane}:stale-error`),
        onFinally: () => events.push(`${lane}:stale-finally`),
      },
    );
    const staleErrorRun = run(
      gate,
      () => staleError.promise,
      {
        onSuccess: () => events.push(`${lane}:older-success`),
        onError: () => events.push(`${lane}:older-error`),
        onFinally: () => events.push(`${lane}:older-finally`),
      },
    );
    const currentRun = run(
      gate,
      () => currentSuccess.promise,
      {
        onSuccess: () => events.push(`${lane}:current-success`),
        onError: () => events.push(`${lane}:current-error`),
        onFinally: () => events.push(`${lane}:current-finally`),
      },
    );

    staleSuccess.resolve("stale success");
    staleError.reject(new Error("stale error"));
    currentSuccess.resolve("current success");

    const results = await Promise.all([
      staleSuccessRun,
      staleErrorRun,
      currentRun,
    ]);

    assert.deepEqual(events, [
      `${lane}:current-success`,
      `${lane}:current-finally`,
    ]);
    assert.deepEqual(
      results.map(({ ok, current }) => ({ ok, current })),
      [
        { ok: true, current: false },
        { ok: false, current: false },
        { ok: true, current: true },
      ],
    );
  });
}

test("production runner commits the current error and finally handlers", async () => {
  assert.equal(typeof studentSetLoader.runLatestRequest, "function");
  if (typeof studentSetLoader.runLatestRequest !== "function") {
    return;
  }

  const events = [];
  const result = await studentSetLoader.runLatestRequest(
    studentSetLoader.createRequestGate(),
    async () => {
      throw new Error("current error");
    },
    {
      onError: (error) => events.push(error.message),
      onFinally: () => events.push("current-finally"),
    },
  );

  assert.deepEqual(events, ["current error", "current-finally"]);
  assert.deepEqual(
    { ok: result.ok, current: result.current },
    { ok: false, current: true },
  );
});

test("vocabulary ownership blocks matching load and toggle until settlement", async () => {
  assert.equal(typeof studentSetLoader.createExclusiveRequestGuard, "function");
  assert.equal(typeof studentSetLoader.runExclusiveRequest, "function");
  if (
    typeof studentSetLoader.createExclusiveRequestGuard !== "function" ||
    typeof studentSetLoader.runExclusiveRequest !== "function"
  ) {
    return;
  }

  const guard = studentSetLoader.createExclusiveRequestGuard();
  const vocabularyResponse = createDeferred();
  const vocabularyGate = studentSetLoader.createRequestGate();
  const vocabularyRequest = studentSetLoader.runExclusiveRequest(
    guard,
    "vocabulary",
    vocabularyGate,
    () => vocabularyResponse.promise,
  );
  let blockedMatchingRequestCalled = false;
  const blockedMatchingRequest = studentSetLoader.runExclusiveRequest(
    guard,
    "matching",
    studentSetLoader.createRequestGate(),
    () => {
      blockedMatchingRequestCalled = true;
      return Promise.resolve(["matching"]);
    },
  );

  assert.equal((await blockedMatchingRequest).blocked, true);
  assert.equal(blockedMatchingRequestCalled, false);
  assert.equal(guard.acquire("matching-toggle"), false);

  vocabularyGate.begin();
  vocabularyResponse.resolve(["vocabulary"]);
  const vocabularyResult = await vocabularyRequest;
  assert.equal(vocabularyResult.ok, true);
  assert.equal(vocabularyResult.current, false);
  assert.equal(guard.isBusy(), false);

  const nextMatchingRequest = await studentSetLoader.runExclusiveRequest(
    guard,
    "matching",
    studentSetLoader.createRequestGate(),
    () => Promise.resolve(["matching"]),
  );
  assert.equal(nextMatchingRequest.ok, true);
  assert.equal(nextMatchingRequest.blocked, undefined);
});

test("matching ownership blocks vocabulary load and preserves matching items", async () => {
  assert.equal(typeof studentSetLoader.createExclusiveRequestGuard, "function");
  assert.equal(typeof studentSetLoader.runExclusiveRequest, "function");
  if (
    typeof studentSetLoader.createExclusiveRequestGuard !== "function" ||
    typeof studentSetLoader.runExclusiveRequest !== "function"
  ) {
    return;
  }

  const guard = studentSetLoader.createExclusiveRequestGuard();
  const matchingResponse = createDeferred();
  let matchingItems = [];
  const matchingRequest = studentSetLoader.runExclusiveRequest(
    guard,
    "matching",
    studentSetLoader.createRequestGate(),
    () => matchingResponse.promise,
    {
      onSuccess: (items) => {
        matchingItems = items;
      },
    },
  );
  let blockedVocabularyRequestCalled = false;
  const blockedVocabularyRequest = studentSetLoader.runExclusiveRequest(
    guard,
    "vocabulary",
    studentSetLoader.createRequestGate(),
    () => {
      blockedVocabularyRequestCalled = true;
      return Promise.resolve(["vocabulary"]);
    },
  );

  assert.equal((await blockedVocabularyRequest).blocked, true);
  assert.equal(blockedVocabularyRequestCalled, false);

  matchingResponse.resolve(["matching-1", "matching-2"]);
  const matchingResult = await matchingRequest;
  assert.equal(matchingResult.ok, true);
  assert.deepEqual(matchingItems, ["matching-1", "matching-2"]);
  assert.equal(guard.isBusy(), false);

  const nextVocabularyRequest = await studentSetLoader.runExclusiveRequest(
    guard,
    "vocabulary",
    studentSetLoader.createRequestGate(),
    () => Promise.resolve(["vocabulary"]),
  );
  assert.equal(nextVocabularyRequest.ok, true);
  assert.deepEqual(matchingItems, ["matching-1", "matching-2"]);
});

test("invalidating an obsolete set load lets a fresh load start immediately", async () => {
  const guard = studentSetLoader.createExclusiveRequestGuard();
  const staleResponse = createDeferred();
  const staleGate = studentSetLoader.createRequestGate();
  const staleRequest = studentSetLoader.runExclusiveRequest(
    guard,
    "vocabulary",
    staleGate,
    () => staleResponse.promise,
  );

  staleGate.begin();
  guard.invalidate();

  const freshRequest = await studentSetLoader.runExclusiveRequest(
    guard,
    "vocabulary",
    staleGate,
    () => Promise.resolve(["fresh"]),
  );
  assert.equal(freshRequest.ok, true);
  assert.equal(guard.isBusy(), false);

  staleResponse.resolve(["stale"]);
  const staleResult = await staleRequest;
  assert.equal(staleResult.current, false);
  assert.equal(guard.isBusy(), false);
});

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
