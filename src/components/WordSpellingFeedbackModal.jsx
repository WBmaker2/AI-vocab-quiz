import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export function WordSpellingFeedbackModal({
  feedbackTone,
  feedbackMessage,
  score,
  correctCount,
  accuracy,
  questionIndex,
  questionCount,
  onNext,
  mode = "result",
  attemptsRemaining = 0,
  canRevealHint = false,
  onRetry,
  onRevealHint,
}) {
  const modalRef = useRef(null);
  const nextButtonRef = useRef(null);
  const isAttemptFeedback = mode === "attempt";
  const isLastQuestion = questionIndex >= questionCount - 1;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement;
    document.body.style.overflow = "hidden";
    nextButtonRef.current?.focus();

    function getFocusableElements() {
      return Array.from(
        modalRef.current?.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => element.getClientRects().length > 0);
    }

    function handleKeyDown(event) {
      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        modalRef.current?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, []);

  const modal = (
    <div className="word-spelling-feedback-modal-backdrop">
      <section
        ref={modalRef}
        tabIndex={-1}
        className={
          "word-spelling-feedback-modal" +
          (isAttemptFeedback ? " word-spelling-feedback-modal-attempt" : "")
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="word-spelling-feedback-modal-title"
        aria-describedby="word-spelling-feedback-modal-description"
        data-testid={
          isAttemptFeedback
            ? "word-spelling-attempt-feedback-modal"
            : "word-spelling-result-feedback-modal"
        }
      >
        <div className="word-spelling-feedback-modal-header">
          <div>
            <p className="mode-label">Spelling Feedback</p>
            <h2 id="word-spelling-feedback-modal-title">
              {isAttemptFeedback ? "다시 도전해 볼까요?" : "입력 결과"}
            </h2>
          </div>
          <span className="word-spelling-modal-status">
            {isAttemptFeedback
              ? `남은 기회 ${attemptsRemaining}번`
              : isLastQuestion
                ? "마지막 문제"
                : `${questionIndex + 1}번째 문제 완료`}
          </span>
        </div>

        {isAttemptFeedback ? (
          <div
            className={`feedback-card word-spelling-feedback word-spelling-feedback-${feedbackTone} word-spelling-attempt-prompts`}
            aria-live="assertive"
          >
            <p id="word-spelling-feedback-modal-description">
              <strong>아쉽지만 틀렸습니다.</strong>
            </p>
            <p>다시 시도해 볼까요?</p>
            <p>
              {canRevealHint
                ? "힌트를 하나 더 열어볼까요?"
                : "보이는 철자를 다시 살펴보고 써 보세요."}
            </p>
          </div>
        ) : (
          <div
            className={`feedback-card word-spelling-feedback word-spelling-feedback-${feedbackTone}`}
            aria-live="polite"
          >
            <p id="word-spelling-feedback-modal-description">{feedbackMessage}</p>
          </div>
        )}

        {isAttemptFeedback ? null : (
          <div className="word-spelling-modal-progress">
            <p className="mode-label">Spelling Progress</p>
            <h3>진행 상황</h3>
            <div className="progression-metrics word-spelling-modal-metrics">
              <div className="progression-metric">
                <span>문제</span>
                <strong>{questionIndex + 1} / {questionCount}</strong>
              </div>
              <div className="progression-metric">
                <span>맞힌 문제</span>
                <strong>{correctCount}개</strong>
              </div>
              <div className="progression-metric">
                <span>정확도</span>
                <strong>{accuracy}%</strong>
              </div>
              <div className="progression-metric">
                <span>현재 점수</span>
                <strong>{score}점</strong>
              </div>
            </div>
          </div>
        )}

        <div className="word-spelling-feedback-modal-actions">
          {isAttemptFeedback ? (
            <>
              <p>천천히 생각하고 다시 써도 괜찮아요.</p>
              <div className="word-spelling-feedback-modal-button-group">
                <button
                  ref={nextButtonRef}
                  className="primary-button gi-pulse"
                  type="button"
                  onClick={onRetry}
                >
                  다시 시도하기
                </button>
                {canRevealHint ? (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={onRevealHint}
                  >
                    힌트 하나 더 열기
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <p>Enter 또는 Space를 누르면 바로 진행합니다.</p>
              <button
                ref={nextButtonRef}
                className="primary-button gi-pulse"
                type="button"
                onClick={onNext}
                aria-keyshortcuts="Enter Space"
              >
                {isLastQuestion ? "결과 보기" : "다음 문제"}
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );

  return typeof document === "undefined" ? modal : createPortal(modal, document.body);
}
