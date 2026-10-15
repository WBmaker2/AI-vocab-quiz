export function getFeedbackMessage(question, selectedAnswer, status) {
  if (status === "correct") {
    return `정답입니다. "${question.word}"의 뜻은 "${question.meaning}"입니다.`;
  }

  if (status === "incorrect") {
    return `"${selectedAnswer}"는 오답입니다. 정답은 "${question.meaning}"입니다.`;
  }

  return "스피커 버튼을 누르거나 자동 재생을 듣고 알맞은 뜻을 고르세요.";
}
