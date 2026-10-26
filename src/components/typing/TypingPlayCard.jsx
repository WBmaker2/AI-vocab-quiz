import { ProgressBar } from "../ProgressBar.jsx";
import { createTypingHint, formatAverageSeconds } from "../../utils/wordTyping.js";

export function TypingPlayCard({ isReviewPhase, onBack, reviewIndex, reviewItems, reviewScore, questionIndex, questions, score, combo, attemptCount, attemptLimit, bestCombo, reviewProgressValue, progressValue, activeQuestion, speech, speakCurrentWord, inputRef, currentInput, setCurrentInput, transitionLockedRef, handleSubmit, handleShowHint, hintUsed, feedbackTone, feedbackMessage, completedCount, averageSeconds }) {
  return (
    <section className="workspace-panel word-typing-shell">
      <div className="section-heading">
        <div>
          <p className="mode-label">{isReviewPhase ? "Typing Review" : "Word Typing"}</p>
          <h2>{isReviewPhase ? "방금 틀린 단어 다시 쓰기" : "영어 단어 타자 게임"}</h2>
        </div>
        <button className="ghost-button" onClick={onBack}>
          홈으로
        </button>
      </div>

      <div className="quiz-grid word-typing-grid">
        <div className="quiz-main">
          <article className="scoreboard-card word-typing-scoreboard">
            <div>
              <span>{isReviewPhase ? "복습 문제" : "현재 문제"}</span>
              <strong>
                {isReviewPhase
                  ? `${Math.min(reviewIndex + 1, reviewItems.length)} / ${reviewItems.length}`
                  : `${Math.min(questionIndex + 1, questions.length)} / ${questions.length}`}
              </strong>
            </div>
            <div>
              <span>{isReviewPhase ? "복습 정답 수" : "현재 점수"}</span>
              <strong>{isReviewPhase ? `${reviewScore}개` : `${score}점`}</strong>
            </div>
            <div>
              <span>{isReviewPhase ? "복습 남은 문제" : "현재 콤보"}</span>
              <strong>
                {isReviewPhase
                  ? `${Math.max(reviewItems.length - reviewIndex - 1, 0)}개`
                  : `${combo}콤보`}
              </strong>
            </div>
            <div>
              <span>남은 기회</span>
              <strong>{Math.max(attemptLimit - attemptCount, 0)}번</strong>
            </div>
          </article>

          <article className="question-card word-typing-prompt-card">
            <div className="question-head">
              <div>
                <p className="mode-label">{isReviewPhase ? `Review ${reviewIndex + 1}` : "Current Mission"}</p>
                <h3>{isReviewPhase ? "방금 틀린 단어를 다시 입력해 보세요" : "이 뜻에 맞는 영어 단어를 입력해 보세요"}</h3>
              </div>
              <span className="word-typing-combo-badge">
                {isReviewPhase ? "복습 모드" : `최고 ${bestCombo}콤보`}
              </span>
            </div>

            <ProgressBar
              value={isReviewPhase ? reviewProgressValue : progressValue}
              max={isReviewPhase ? reviewItems.length : questions.length}
            />

            <div className="word-typing-meaning-card">
              <span>한국어 뜻</span>
              <strong className="word-typing-meaning">{activeQuestion?.meaning ?? ""}</strong>
              <p className="question-copy">
                {isReviewPhase
                  ? "방금 틀린 단어만 다시 모았습니다. 이번에는 철자를 천천히 떠올려 보세요."
                  : "영어 발음을 듣고 아래 입력창에 단어를 직접 써 보세요."}
              </p>
            </div>
          </article>

          <article className="question-card word-typing-input-card">
            <div className="question-head">
              <div>
                <p className="mode-label">Type The Word</p>
                <h3>영어 단어 입력</h3>
              </div>
              <button
                className="secondary-button"
                onClick={speakCurrentWord}
                disabled={!activeQuestion || !speech.supported}
              >
                {isReviewPhase ? "복습 발음 듣기" : "발음 듣기"}
              </button>
            </div>

            <form
              className="word-typing-input-form"
              autoComplete="off"
              onSubmit={handleSubmit}
            >
              <input
                ref={inputRef}
                className="word-typing-textbox"
                value={currentInput}
                onChange={(event) => setCurrentInput(event.target.value)}
                placeholder="영어 단어를 입력하세요"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="done"
                disabled={transitionLockedRef.current}
              />
              <button className="primary-button" type="submit" disabled={transitionLockedRef.current}>
                입력 완료
              </button>
            </form>

            <div className="word-typing-hint-row">
              <button
                className="ghost-button"
                type="button"
                onClick={handleShowHint}
                disabled={!activeQuestion || hintUsed || transitionLockedRef.current}
              >
                {hintUsed ? "힌트 사용 완료" : "힌트 보기"}
              </button>
              <div className="word-typing-hint-box" aria-live="polite">
                <span>글자 수 {activeQuestion?.letterCount ?? 0}</span>
                <strong>{hintUsed && activeQuestion ? createTypingHint(activeQuestion.word) : "필요할 때 힌트를 열어 보세요."}</strong>
              </div>
            </div>
          </article>
        </div>

        <div className="quiz-side">
          <article className="hint-card word-typing-feedback-card">
            <p className="mode-label">Typing Feedback</p>
            <h3>입력 결과</h3>
            <div className={`feedback-card word-typing-feedback word-typing-feedback-${feedbackTone}`}>
              <p>{feedbackMessage}</p>
            </div>
            <div className="feedback-meta">
              {isReviewPhase ? (
                <>
                  <span>복습에서는 원래 점수를 바꾸지 않고, 다시 맞힌 개수만 따로 보여줍니다.</span>
                  <span>3번 틀리면 정답을 보여준 뒤 다음 복습 문제로 넘어갑니다.</span>
                </>
              ) : (
                <>
                  <span>정답은 빠를수록 보너스를 받지만, 가장 중요한 것은 정확하게 쓰는 것입니다.</span>
                  <span>3번 틀리면 정답을 알려주고 다음 문제로 넘어갑니다.</span>
                </>
              )}
            </div>
          </article>

          {isReviewPhase ? (
            <article className="session-review-card">
              <p className="mode-label">Review Progress</p>
              <h3>타자 오답 복습 진행 중</h3>
              <div className="session-review-progress">
                <span>복습 정답 수</span>
                <strong>{reviewScore} / {reviewItems.length}</strong>
              </div>
              <div className="session-review-progress">
                <span>남은 복습 문제</span>
                <strong>{Math.max(reviewItems.length - reviewIndex - 1, 0)}개</strong>
              </div>
            </article>
          ) : (
            <article className="hint-card word-typing-tip-card">
              <p className="mode-label">Typing Tip</p>
              <h3>진행 팁</h3>
              <p className="question-copy">
                뜻을 먼저 보고, 발음을 들은 뒤 또박또박 철자를 떠올려 입력해 보세요.
                틀렸을 때는 발음을 다시 듣고 힌트를 참고하면 좋습니다.
              </p>
              <div className="progression-metrics">
                <div className="progression-metric">
                  <span>완료한 문제</span>
                  <strong>{completedCount}개</strong>
                </div>
                <div className="progression-metric">
                  <span>평균 입력 시간</span>
                  <strong>{formatAverageSeconds(averageSeconds)}</strong>
                </div>
              </div>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
