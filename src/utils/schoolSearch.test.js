import test from "node:test";
import assert from "node:assert/strict";
import {
  createSchoolSearchRange,
  normalizeSchoolSearchName,
} from "./schoolSearch.js";

test("normalizeSchoolSearchName trims, collapses spaces, and lowercases", () => {
  assert.equal(normalizeSchoolSearchName("  서울  초등학교 "), "서울 초등학교");
  assert.equal(normalizeSchoolSearchName("SEOUL Elementary"), "seoul elementary");
  assert.equal(normalizeSchoolSearchName(null), "");
});

test("createSchoolSearchRange returns a prefix range", () => {
  assert.deepEqual(createSchoolSearchRange("서울"), {
    start: "서울",
    end: "서울\uf8ff",
  });
  assert.equal(createSchoolSearchRange(""), null);
  assert.equal(createSchoolSearchRange("   "), null);
});
