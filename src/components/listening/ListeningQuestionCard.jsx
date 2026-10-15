import { ProgressBar } from "../ProgressBar.jsx";
import { ScoreBoard } from "../ScoreBoard.jsx";
import { SpeechRateToggle } from "../SpeechRateToggle.jsx";
import { WordImage } from "../WordImage.jsx";
import { getFeedbackMessage } from "./listeningMessages.js";

export function ListeningQuestionCard({
  questionIndex,
  totalQuestions,
  score,
  hasAnswered,
  question,
  selectedAnswer,
  status,
  speech,
  studentGrade,
  onReplay,
  onSelectChoice,
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
              className="secondary-button gi-pulse"
              onClick={onReplay}
              disabled={!speech.supported}
            >
              {speech.speaking ? "읽는 중..." : "다시 듣기"}
            </button>
          </div>

          <SpeechRateToggle speech={speech} studentGrade={studentGrade} />

          <p className="question-copy">
            영어 단어를 듣고 가장 알맞은 뜻을 선택하세요.
          </p>

          <WordImage item={question} />

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
                  onClick={() => onSelectChoice(choice)}
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
              className={`primary-button${hasAnswered ? " gi-pulse" : ""}`}
              onClick={onNext}
              disabled={!hasAnswered}
            >
              {questionIndex === totalQuestions - 1
                ? "결과 보기"
                : "다음 문제"}
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
  );
}
