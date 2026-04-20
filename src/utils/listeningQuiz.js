function getQuestionWord(question) {
  return typeof question?.word === "string" ? question.word.trim() : "";
}

export function getListeningAnnouncementWord(targetQuestion, fallbackQuestion) {
  return getQuestionWord(targetQuestion) || getQuestionWord(fallbackQuestion);
}
