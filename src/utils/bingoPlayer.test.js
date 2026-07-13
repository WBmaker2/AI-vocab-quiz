import test from "node:test";
import assert from "node:assert/strict";
import { canMarkBingoCell } from "./bingo.js";
import { normalizeBingoRank } from "./bingoPlayer.js";

test("normalizeBingoRank preserves only positive integer ranks", () => {
  assert.equal(normalizeBingoRank(1), 1);
  assert.equal(normalizeBingoRank(" 2 "), 2);
  assert.equal(normalizeBingoRank(3.5), null);
  assert.equal(normalizeBingoRank(0), null);
  assert.equal(normalizeBingoRank(-1), null);
  assert.equal(normalizeBingoRank(Number.NaN), null);
});

test("normalizeBingoRank keeps missing and invalid ranks null", () => {
  for (const value of [null, undefined, "", "   ", Infinity, true, {}]) {
    assert.equal(normalizeBingoRank(value), null);
  }
});

test("canMarkBingoCell allows only the current unmarked word", () => {
  const currentWord = {
    activeWordId: "word-1",
    activeWordText: "Apple",
    cellWordId: "word-1",
    cellWordText: "apple",
  };

  assert.equal(canMarkBingoCell({ ...currentWord, alreadyMarked: false }), true);
  assert.equal(
    canMarkBingoCell({
      ...currentWord,
      cellWordId: "word-2",
      cellWordText: "book",
      alreadyMarked: false,
    }),
    false,
  );
  assert.equal(canMarkBingoCell({ ...currentWord, alreadyMarked: true }), false);
});
