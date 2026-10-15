import test from "node:test";
import assert from "node:assert/strict";
import { aggregateWordMissReports, filterWordMissReports } from "./wordMissStats.js";

test("aggregates misses by word with counts", () => {
  const ranked = aggregateWordMissReports([
    { word: "pants", meaning: "바지" },
    { word: "Pants", meaning: "바지" },
    { word: "apple", meaning: "사과" },
  ]);
  assert.equal(ranked[0].word, "pants");
  assert.equal(ranked[0].count, 2);
  assert.equal(ranked[1].count, 1);
});

test("ignores blank words and respects the limit", () => {
  const ranked = aggregateWordMissReports([{ word: "" }, { word: "apple" }], 1);
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].word, "apple");
});

test("filters reports by grade and activity", () => {
  const reports = [
    { word: "a", grade: "3", activityType: "listening" },
    { word: "b", grade: "4", activityType: "listening" },
    { word: "c", grade: "3", activityType: "speaking" },
  ];
  assert.equal(filterWordMissReports(reports, { grade: "3" }).length, 2);
  assert.equal(filterWordMissReports(reports, { activityType: "speaking" }).length, 1);
});
