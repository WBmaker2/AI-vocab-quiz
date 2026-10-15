import test from "node:test";
import assert from "node:assert/strict";
import { getWordEmoji } from "./wordEmoji.js";

test("returns emoji for known beginner words", () => {
  assert.equal(getWordEmoji("apple"), "🍎");
  assert.equal(getWordEmoji("Pants"), "👖");
  assert.equal(getWordEmoji("T-shirt"), "👕");
});

test("resolves plural forms to the singular emoji", () => {
  assert.equal(getWordEmoji("t-shirts"), "👕");
  assert.equal(getWordEmoji("apples"), "🍎");
});

test("returns empty string for unknown or blank words", () => {
  assert.equal(getWordEmoji("photosynthesis"), "");
  assert.equal(getWordEmoji(""), "");
  assert.equal(getWordEmoji(null), "");
});
