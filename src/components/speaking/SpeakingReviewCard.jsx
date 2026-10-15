import { MicLevelMeter } from "./MicLevelMeter.jsx";
import { getStatusMessage } from "./speakingMessages.js";
import { ProgressBar } from "../ProgressBar.jsx";
import { ScoreBoard } from "../ScoreBoard.jsx";
import { WordImage } from "../WordImage.jsx";

export function SpeakingReviewCard({
  reviewIndex,
  reviewItems,
  reviewScore,
  reviewStatus,
  reviewQuestion,
  reviewAttemptTranscript,
  reviewGuidance,
  speech,
  recognition,
  canAdvanceReview,
  onReplayWord,
  onStartListening,
  onResetReviewAttempt,
  onNextReviewQuestion,
}) {
  return (
    <div className="quiz-grid">
      <div className="quiz-main">
        <ScoreBoard
          questionIndex={reviewIndex}
          totalQuestions={reviewItems.length}
          score={reviewScore}
        />
        <ProgressBar
          value={reviewIndex + (reviewStatus === "correct" ? 1 : 0)}
          max={reviewItems.length}
        />

        <article className="question-card">
          <div className="question-head">
            <div>
              <p className="mode-label">Review {reviewIndex + 1}</p>
              <h3>헷갈렸던 단어를 다시 보고 말해보세요</h3>
            </div>
            <button
              className="secondary-button"
              onClick={onReplayWord}
              disabled={!speech.supported}
            >
              {speech.speaking ? "읽는 중..." : "원어민 발음 듣기"}
            </button>
          </div>

          <div className="speaking-word-card">
            <WordImage item={reviewQuestion} />
            <p className="speaking-word">{reviewQuestion?.word ?? ""}</p>
            <p className="speaking-meaning">{reviewQuestion?.meaning ?? ""}</p>
          </div>

          <div className="toolbar-row">
            <button
              className={`primary-button${recognition.listening || reviewStatus === "correct" ? "" : " gi-pulse"}`}
              onClick={onStartListening}
              disabled={recognition.listening || reviewStatus === "correct"}
            >
              {recognition.listening ? "듣는 중..." : "마이크로 다시 말하기"}
            </button>
            <button
              className="ghost-button"
              onClick={onResetReviewAttempt}
              disabled={recognition.listening || reviewStatus === "correct"}
            >
              다시 시도 준비
            </button>
          </div>

          <MicLevelMeter active={recognition.listening} />

          <div className="feedback-card" aria-live="polite">
            <p>
              {getStatusMessage({
                supported: recognition.supported,
                listening: recognition.listening,
                transcript: reviewAttemptTranscript,
                question: reviewQuestion,
                status: reviewStatus,
              })}
            </p>
            <div className="feedback-meta">
              <span>
                인식 결과: {reviewAttemptTranscript || recognition.transcript || "아직 없음"}
              </span>
              {recognition.listening && recognition.interimTranscript ? (
                <span>듣는 중: {recognition.interimTranscript}</span>
              ) : null}
              {reviewQuestion?.exampleSentence ? (
                <span>예문: {reviewQuestion.exampleSentence}</span>
              ) : null}
              {recognition.error ? (
                <span>인식 상태: {recognition.error}</span>
              ) : null}
              {recognition.microphoneState !== "unknown" ? (
                <span>마이크 상태: {recognition.microphoneState}</span>
              ) : null}
            </div>
          </div>

          {reviewGuidance ? (
            <article className="guidance-card" aria-live="polite">
              <strong>{reviewGuidance.title}</strong>
              <p>{reviewGuidance.body}</p>
            </article>
          ) : null}

          <div className="toolbar-row">
            <button
              className={`primary-button${canAdvanceReview ? " gi-pulse" : ""}`}
              onClick={onNextReviewQuestion}
              disabled={!canAdvanceReview}
            >
              {reviewIndex === reviewItems.length - 1
                ? "복습 결과 보기"
                : "다음 복습 단어"}
            </button>
          </div>
        </article>
      </div>

      <aside className="quiz-side">
        <article className="session-review-card">
          <p className="mode-label">Review Progress</p>
          <h4>말하기 오답 복습 진행 중</h4>
          <div className="session-review-progress">
            <span>복습 정답 수</span>
            <strong>{reviewScore} / {reviewItems.length}</strong>
          </div>
          <div className="session-review-progress">
            <span>남은 복습 문제</span>
            <strong>{Math.max(reviewItems.length - reviewIndex - 1, 0)}개</strong>
          </div>
        </article>
      </aside>
    </div>
  );
}
