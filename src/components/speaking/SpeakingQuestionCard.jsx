import { MicLevelMeter } from "./MicLevelMeter.jsx";
import { getStatusMessage } from "./speakingMessages.js";
import { ProgressBar } from "../ProgressBar.jsx";
import { ScoreBoard } from "../ScoreBoard.jsx";
import { SpeechRateToggle } from "../SpeechRateToggle.jsx";
import { WordImage } from "../WordImage.jsx";

export function SpeakingQuestionCard({
  questionIndex,
  totalQuestions,
  score,
  status,
  question,
  speech,
  studentGrade,
  recognition,
  attemptTranscript,
  guidance,
  isLockedAfterCorrect,
  canAdvance,
  onReplayWord,
  onStartListening,
  onTryAgain,
  onNext,
}) {
  return (
    <div className="quiz-grid">
      <div className="quiz-main">
        <ScoreBoard
          questionIndex={questionIndex}
          totalQuestions={totalQuestions}
          score={score}
        />
        <ProgressBar
          value={questionIndex + (status === "correct" ? 1 : 0)}
          max={totalQuestions}
        />

        <article className="question-card">
          <div className="question-head">
            <div>
              <p className="mode-label">Question {questionIndex + 1}</p>
              <h3>화면의 단어를 보고 영어로 말해보세요</h3>
            </div>
            <button
              className="secondary-button"
              onClick={onReplayWord}
              disabled={!speech.supported}
            >
              {speech.speaking ? "읽는 중..." : "원어민 발음 듣기"}
            </button>
          </div>

          <SpeechRateToggle speech={speech} studentGrade={studentGrade} />

          <div className="speaking-word-card">
            <WordImage item={question} />
            <p className="speaking-word">{question.word}</p>
            <p className="speaking-meaning">{question.meaning}</p>
          </div>

          <div className="toolbar-row">
            <button
              className={`primary-button${recognition.listening || isLockedAfterCorrect ? "" : " gi-pulse"}`}
              onClick={onStartListening}
              disabled={recognition.listening || isLockedAfterCorrect}
            >
              {recognition.listening ? "듣는 중..." : "마이크로 말하기"}
            </button>
            <button
              className="ghost-button"
              onClick={onTryAgain}
              disabled={recognition.listening || isLockedAfterCorrect}
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
                transcript: attemptTranscript,
                question,
                status,
              })}
            </p>
            <div className="feedback-meta">
              <span>
                인식 결과: {attemptTranscript || recognition.transcript || "아직 없음"}
              </span>
              {recognition.listening && recognition.interimTranscript ? (
                <span>듣는 중: {recognition.interimTranscript}</span>
              ) : null}
              {question.exampleSentence ? (
                <span>예문: {question.exampleSentence}</span>
              ) : null}
              {recognition.error ? (
                <span>인식 상태: {recognition.error}</span>
              ) : null}
              {recognition.microphoneState !== "unknown" ? (
                <span>마이크 상태: {recognition.microphoneState}</span>
              ) : null}
            </div>
          </div>

          {guidance ? (
            <article className="guidance-card" aria-live="polite">
              <strong>{guidance.title}</strong>
              <p>{guidance.body}</p>
            </article>
          ) : null}

          <div className="toolbar-row">
            <button
              className={`primary-button${canAdvance ? " gi-pulse" : ""}`}
              onClick={onNext}
              disabled={!canAdvance}
            >
              {questionIndex === totalQuestions - 1
                ? "결과 보기"
                : "다음 단어"}
            </button>
          </div>
        </article>
      </div>

      <aside className="quiz-side">
        <article className="hint-card">
          <p className="mode-label">Speaking Tip</p>
          <h3>진행 팁</h3>
          <p>
            단어를 또박또박 읽고, 오답일 때는 원어민 발음 듣기 후 다시
            읽으면 좋습니다.
          </p>
        </article>

        <article className="hint-card">
          <p className="mode-label">Current Set</p>
          <h3>이번 활동 단어 수</h3>
          <p className="result-score">{totalQuestions}</p>
          <p className="result-copy">
            맞게 말한 단어만 점수에 반영됩니다.
          </p>
        </article>
      </aside>
    </div>
  );
}
