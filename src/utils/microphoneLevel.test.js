import test from "node:test";
import assert from "node:assert/strict";
import {
  computeMicrophoneLevel,
  describeMicrophoneLevel,
} from "./microphoneLevel.js";

test("silence stays near zero", () => {
  const level = computeMicrophoneLevel(new Uint8Array([128, 128, 128, 128]));
  assert.equal(level, 0);
  assert.equal(describeMicrophoneLevel(level), "quiet");
});

test("loud input is clamped to one", () => {
  const level = computeMicrophoneLevel(new Uint8Array([0, 255, 0, 255]));
  assert.equal(level, 1);
  assert.equal(describeMicrophoneLevel(level), "loud");
});

test("empty input returns zero", () => {
  assert.equal(computeMicrophoneLevel(null), 0);
  assert.equal(computeMicrophoneLevel(new Uint8Array([])), 0);
});
