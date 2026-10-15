import test from "node:test";
import assert from "node:assert/strict";
import { getGuidance, getStatusMessage } from "./speakingMessages.js";

test("network error in chrome guides network checks instead of browser switch", () => {
  const guidance = getGuidance("speech-recognition-network-error", "chrome");
  assert.equal(guidance.title, "음성 인식 서버에 연결하지 못했습니다");
  assert.match(guidance.body, /시크릿/);
});

test("network error in other browsers still suggests chrome or edge", () => {
  const guidance = getGuidance("speech-recognition-network-error", "safari");
  assert.equal(guidance.title, "브라우저 음성 인식을 시작하지 못했습니다");
  const fallback = getGuidance("speech-recognition-network-error");
  assert.equal(fallback.title, "브라우저 음성 인식을 시작하지 못했습니다");
});

test("status message covers listening and empty states", () => {
  assert.match(
    getStatusMessage({ supported: true, listening: true }),
    /듣는 중/,
  );
  assert.match(
    getStatusMessage({ supported: false, listening: false }),
    /Chrome 또는 Edge/,
  );
});
