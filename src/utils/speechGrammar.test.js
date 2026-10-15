import test from "node:test";
import assert from "node:assert/strict";
import {
  attachSpeechGrammar,
  buildSpeechGrammar,
  sanitizeGrammarToken,
} from "./speechGrammar.js";

test("sanitizes tokens for JSGF grammar", () => {
  assert.equal(sanitizeGrammarToken("Apple!"), "apple");
  assert.equal(sanitizeGrammarToken("ice cream"), "ice cream");
  assert.equal(sanitizeGrammarToken(""), "");
});

test("builds a deduplicated grammar string", () => {
  const grammar = buildSpeechGrammar(["apple", "banana", "apple", "", "school"]);
  assert.equal(
    grammar,
    "#JSGF V1.0; grammar vocab; public <vocab> = apple | banana | school;",
  );
});

test("returns empty grammar when no usable word exists", () => {
  assert.equal(buildSpeechGrammar([]), "");
  assert.equal(buildSpeechGrammar(["", null]), "");
});

test("attach returns false without a browser grammar list", () => {
  assert.equal(attachSpeechGrammar({}, "#JSGF V1.0;"), false);
  assert.equal(attachSpeechGrammar(null, "#JSGF V1.0;"), false);
});
