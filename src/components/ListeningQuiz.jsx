import { useEffect, useEffectEvent, useState } from "react";
import { ProgressBar } from "./ProgressBar.jsx";
import { ResultSummary } from "./ResultSummary.jsx";
import { ScoreBoard } from "./ScoreBoard.jsx";
import { createListeningQuestions } from "../utils/quiz.js";

function getFeedbackMessage(question, selectedAnswer, status) {
  if (status === "correct") {
    return `정답입니다. "${question.word}"의 뜻은 "${question.meaning}"입니다.`;
  }

  if (status === "incorrect") {
    return `"${selectedAnswer}"는 오답입니다. 정답은 "${question.meaning}"입니다.`;
  }

  return "스피커 버튼을 누르거나 자동 재생을 듣고 알맞은 뜻을 고르세요.";
}

export function ListeningQuiz({
  items,
  speech,
  onBack,
  onOpenTeacher,
}) {
  const [questions, setQuestions] = useState(() =>
    createListeningQuestions(items),
  );
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    setQuestions(createListeningQuestions(items));
    setQuestionIndex(0);
    setScore(0);
    setSelectedAnswer("");
    setStatus("idle");
  }, [items]);

  const totalQuestions = questions.length;
  const question = questions[questionIndex];
  const isComplete = status === "complete";
  const hasAnswered = status === "correct" || status === "incorrect";

  const announceQuestion = useEffectEvent(() => {
    if (!question) {
      return;
    }

    speech.speak(question.word, {
      lang: "en-US",
      rate: 0.9,
    });
  });

  useEffect(() => {
    if (!question || isComplete) {
      return;
    }

    announceQuestion();
  }, [announceQuestion, isComplete, question?.id]);

  function handleSelectChoice(choice) {
    if (!question || hasAnswered) {
      return;
    }

    const isCorrect = choice === question.meaning;
    setSelectedAnswer(choice);
    setStatus(isCorrect ? "correct" : "incorrect");

    if (isCorrect) {
      setScore((current) => current + 1);
    }
  }

  function handleNext() {
    if (!question) {
      return;
    }

    if (questionIndex === totalQuestions - 1) {
      setStatus("complete");
      speech.cancel();
      return;
    }

    setQuestionIndex((current) => current + 1);
    setSelectedAnswer("");
    setStatus("idle");
  }

  function handleRetry() {
    setQuestions(createListeningQuestions(items));
    setQuestionIndex(0);
    setScore(0);
    setSelectedAnswer("");
    setStatus("idle");
  }

  if (items.length === 0) {
    return (
      <section className="workspace-panel">
        <div className="section-heading">
          <div>
            <p className="mode-label">Listening Quiz</p>
            <h2>듣기 퀴즈</h2>
          </div>
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>

        <article className="empty-card">
          <h3>먼저 단어 세트를 불러오세요</h3>
          <p>
            듣기 퀴즈를 시작하려면 홈 화면에서 학년과 단원을 선택한 뒤 학생용
            단어 세트를 먼저 불러와야 합니다.
          </p>
          <div className="toolbar-row">
            <button className="ghost-button" onClick={onBack}>
              홈으로
            </button>
            <button className="secondary-button" onClick={onOpenTeacher}>
              Teacher Mode 열기
            </button>
          </div>
        </article>
      </section>
    );
  }

  if (isComplete) {
    return (
      <section className="workspace-panel">
        <div className="section-heading">
          <div>
            <p className="mode-label">Listening Quiz</p>
            <h2>듣기 퀴즈 완료</h2>
          </div>
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>

        <ResultSummary
          title="듣고 뜻 고르기 완료"
          score={score}
          total={totalQuestions}
          onRetry={handleRetry}
          onBack={onBack}
          onOpenTeacher={onOpenTeacher}
        />
      </section>
    );
  }

  return (
    <section className="workspace-panel">
      <div className="section-heading">
        <div>
          <p className="mode-label">Listening Quiz</p>
          <h2>듣고 뜻 고르기</h2>
        </div>
        <button className="ghost-button" onClick={onBack}>
          홈으로
        </button>
      </div>

      <div className="quiz-grid">
        <div className="quiz-main">
          <ScoreBoard
            questionIndex={questionIndex}
            totalQuestions={totalQuestions}
            score={score}
          />
          <ProgressBar
            value={questionIndex + (hasAnswered ? 1 : 0)}
            max={totalQuestions}
          />

          <article className="question-card">
            <div className="question-head">
              <div>
                <p className="mode-label">Question {questionIndex + 1}</p>
                <h3>소리를 듣고 알맞은 뜻을 골라보세요</h3>
              </div>
              <button
                className="secondary-button"
                onClick={announceQuestion}
                disabled={!speech.supported}
              >
                {speech.speaking ? "읽는 중..." : "다시 듣기"}
              </button>
            </div>

            <p className="question-copy">
              영어 단어를 듣고 가장 알맞은 뜻을 선택하세요.
            </p>

            <div className="choices-grid">
              {question.choices.map((choice) => {
                const isSelected = selectedAnswer === choice;
                const isCorrect = choice === question.meaning;
                const choiceClassName = [
                  "choice-button",
                  isSelected ? "choice-selected" : "",
                  hasAnswered && isCorrect ? "choice-correct" : "",
                  hasAnswered && isSelected && !isCorrect
                    ? "choice-incorrect"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <button
                    key={`${question.id}-${choice}`}
                    className={choiceClassName}
                    onClick={() => handleSelectChoice(choice)}
                    disabled={hasAnswered}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>

            <div className="feedback-card" aria-live="polite">
              <p>{getFeedbackMessage(question, selectedAnswer, status)}</p>
              {hasAnswered ? (
                <div className="feedback-meta">
                  <span>정답 단어: {question.word}</span>
                  {question.exampleSentence ? (
                    <span>예문: {question.exampleSentence}</span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="toolbar-row">
              <button
                className="primary-button"
                onClick={handleNext}
                disabled={!hasAnswered}
              >
                {questionIndex === totalQuestions - 1
                  ? "결과 보기"
                  : "다음 문제"}
              </button>
              <button className="ghost-button" onClick={onOpenTeacher}>
                단어 세트 수정
              </button>
            </div>
          </article>
        </div>

        <aside className="quiz-side">
          <article className="hint-card">
            <p className="mode-label">Hint</p>
            <h3>수업 진행 팁</h3>
            <p>
              학생이 헷갈리면 먼저 다시 듣기를 누르고, 정답 확인 후 단어를 한
              번 따라 읽게 해보세요.
            </p>
          </article>

          <article className="hint-card">
            <p className="mode-label">Current Set</p>
            <h3>이번 활동 단어 수</h3>
            <p className="result-score">{totalQuestions}</p>
            <p className="result-copy">
              저장된 단어 전체를 한 번씩 사용합니다.
            </p>
          </article>
        </aside>
      </div>
    </section>
  );
}
