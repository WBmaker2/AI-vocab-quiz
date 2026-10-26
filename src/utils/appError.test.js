import test from "node:test";
import assert from "node:assert/strict";
import { formatAppError, getErrorCode, isKoreanMessage } from "./appError.js";

test("formatAppError maps Firestore permission failures to Korean guidance", () => {
  assert.match(
    formatAppError({ code: "permission-denied", message: "Missing or insufficient permissions." }),
    /권한/,
  );
});

test("formatAppError maps network failures to a connection message", () => {
  assert.match(
    formatAppError({ code: "unavailable", message: "Failed to fetch" }),
    /인터넷 연결/,
  );
});

test("formatAppError keeps existing Korean domain messages", () => {
  assert.equal(
    formatAppError(new Error("학생 이름을 입력해 주세요."), "저장하지 못했습니다."),
    "학생 이름을 입력해 주세요.",
  );
});

test("formatAppError hides unknown English messages behind the fallback", () => {
  assert.equal(
    formatAppError({ code: "unknown", message: "Internal server error" }, "저장하지 못했습니다."),
    "저장하지 못했습니다.",
  );
});

test("error helpers handle strings and missing values", () => {
  assert.equal(getErrorCode(null), "");
  assert.equal(isKoreanMessage("권한 오류"), true);
  assert.equal(isKoreanMessage("permission denied"), false);
  assert.equal(formatAppError(null, "다시 시도해 주세요."), "다시 시도해 주세요.");
});
