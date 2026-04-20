import test from "node:test";
import assert from "node:assert/strict";
import { getListeningAnnouncementWord } from "./listeningQuiz.js";

test("getListeningAnnouncementWord falls back to the active question when a click event is passed", () => {
  const clickEvent = {
    type: "click",
    currentTarget: { textContent: "다시 듣기" },
  };
  const activeQuestion = {
    id: "question-2",
    word: "October",
    meaning: "10월",
  };

  assert.equal(getListeningAnnouncementWord(clickEvent, activeQuestion), "October");
});
