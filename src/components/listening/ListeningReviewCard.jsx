import { ProgressBar } from "../ProgressBar.jsx";
import { ScoreBoard } from "../ScoreBoard.jsx";
import { SpeechRateToggle } from "../SpeechRateToggle.jsx";
import { WordImage } from "../WordImage.jsx";
import { getFeedbackMessage } from "./listeningMessages.js";

export function ListeningReviewCard({
  reviewIndex,
  reviewQuestions,
  reviewScore,
  hasReviewAnswered,
  reviewQuestion,
  reviewSelectedAnswer,
  reviewStatus,
  speech,
  studentGrade,
  onReplay,
  onSelectReviewChoice,
  onNextReviewQuestion,
}) {
  return (
    <div className="quiz-grid">
      <div className="quiz-main">
        <ScoreBoard
          questionIndex={reviewIndex}
          totalQuestions={reviewQuestions.length}
          score={reviewScore}
        />
        <ProgressBar
          value={reviewIndex + (hasReviewAnswered ? 1 : 0)}
          max={reviewQuestions.length}
        />

        <article className="question-card">
          <div className="question-head">
            <div>
              <p className="mode-label">Review {reviewIndex + 1}</p>
              <h3>헷갈렸던 뜻을 다시 들어보고 골라보세요</h3>
            </div>
            <button
              className="secondary-button gi-pulse"
              onClick={onReplay}
              disabled={!speech.supported}
            >
              {speech.speaking ? "읽는 중..." : "다시 듣기"}
            </button>
          </div>

          <SpeechRateToggle speech={speech} studentGrade={studentGrade} />

          <p className="question-copy">
            방금 틀린 문제만 다시 모았습니다. 이번에는 뜻을 천천히 골라보세요.
          </p>

          <WordImage item={reviewQuestion} />

          <div className="choices-grid">
            {reviewQuestion?.choices.map((choice) => {
              const isSelected = reviewSelectedAnswer === choice;
              const isCorrect = choice === reviewQuestion.meaning;
              const choiceClassName = [
                "choice-button",
                isSelected ? "choice-selected" : "",
                hasReviewAnswered && isCorrect ? "choice-correct" : "",
                hasReviewAnswered && isSelected && !isCorrect
                  ? "choice-incorrect"
                  : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <button
                  key={`${reviewQuestion.id}-${choice}`}
                  className={choiceClassName}
                  onClick={() => onSelectReviewChoice(choice)}
                  disabled={hasReviewAnswered}
                >
                  {choice}
                </button>
              );
            })}
          </div>

          <div className="feedback-card" aria-live="polite">
            <p>{getFeedbackMessage(reviewQuestion, reviewSelectedAnswer, reviewStatus)}</p>
            {hasReviewAnswered ? (
              <div className="feedback-meta">
                <span>정답 단어: {reviewQuestion.word}</span>
                {reviewQuestion.exampleSentence ? (
                  <span>예문: {reviewQuestion.exampleSentence}</span>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="toolbar-row">
            <button
              className={`primary-button${hasReviewAnswered ? " gi-pulse" : ""}`}
              onClick={onNextReviewQuestion}
              disabled={!hasReviewAnswered}
            >
              {reviewIndex === reviewQuestions.length - 1
                ? "복습 결과 보기"
                : "다음 복습 문제"}
            </button>
          </div>
        </article>
      </div>

      <aside className="quiz-side">
        <article className="session-review-card">
          <p className="mode-label">Review Progress</p>
          <h4>오답 복습 진행 중</h4>
          <div className="session-review-progress">
            <span>복습 점수</span>
            <strong>{reviewScore} / {reviewQuestions.length}</strong>
          </div>
          <div className="session-review-progress">
            <span>남은 복습 문제</span>
            <strong>{Math.max(reviewQuestions.length - reviewIndex - 1, 0)}개</strong>
          </div>
        </article>
      </aside>
    </div>
  );
}
