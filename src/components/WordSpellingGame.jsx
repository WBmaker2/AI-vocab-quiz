import { useEffect, useMemo, useRef, useState } from "react";
import { WordSpellingResultCard } from "./WordSpellingResultCard.jsx";
import { WordSpellingStartCard } from "./WordSpellingStartCard.jsx";
import {
  calculateSpellingAccuracy,
  calculateSpellingAttemptScore,
  createSpellingQuestions,
  createSpellingHintState,
  isSpellingNextQuestionShortcut,
  isSpellingAnswerRevealed,
  isSpellingAnswerCorrect,
  normalizeSpellingItems,
  revealNextSpellingHint,
  SPELLING_ATTEMPT_LIMIT,
} from "../utils/wordSpelling.js";

export function WordSpellingGame({
  items,
  celebration,
  leaderboardContext,
  remoteConfigured,
  studentNameDraft,
  onStudentNameDraftChange,
  onBack,
}) {
  const spellingItems = useMemo(() => normalizeSpellingItems(items), [items]);
  const inputRef = useRef(null);
  const transitionTimerRef = useRef(null);
  const startedAtRef = useRef(0);
  const completionCelebratedRef = useRef(false);
  const usedMasksByWordRef = useRef(new Map());
  const lastMaskSignatureByWordRef = useRef(new Map());
  const [phase, setPhase] = useState("ready");
  const [questions, setQuestions] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [questionCompleted, setQuestionCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [revealedCount, setRevealedCount] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [currentInput, setCurrentInput] = useState("");
  const [feedbackTone, setFeedbackTone] = useState("idle");
  const [feedbackMessage, setFeedbackMessage] = useState("가려진 철자를 보고 영어 단어를 입력해 보세요.");
  const [hintState, setHintState] = useState(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const itemSetSignature = JSON.stringify(spellingItems.map((item) => [
    item.id,
    item.word,
    item.meaning,
  ]));

  const resetGameState = () => {
    window.clearTimeout(transitionTimerRef.current);
    startedAtRef.current = 0;
    completionCelebratedRef.current = false;
    setPhase("ready");
    setQuestions([]);
    setQuestionIndex(0);
    setAttemptCount(0);
    setQuestionCompleted(false);
    setScore(0);
    setCorrectCount(0);
    setRevealedCount(0);
    setTotalAttempts(0);
    setCurrentInput("");
    setFeedbackTone("idle");
    setFeedbackMessage("가려진 철자를 보고 영어 단어를 입력해 보세요.");
    setHintState(null);
    setElapsedMs(0);
  };

  useEffect(() => {
    usedMasksByWordRef.current.clear();
    lastMaskSignatureByWordRef.current.clear();
    resetGameState();
  }, [itemSetSignature]);

  useEffect(() => {
    if (phase !== "playing") {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setElapsedMs(Math.max(0, Date.now() - startedAtRef.current));
    }, 250);

    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => () => {
    window.clearTimeout(transitionTimerRef.current);
    usedMasksByWordRef.current.clear();
    lastMaskSignatureByWordRef.current.clear();
  }, []);

  const canStart = spellingItems.length > 0;
  const activeQuestion = questions[questionIndex] ?? null;
  const questionCount = questions.length;
  const elapsedSeconds = Math.max(0, Math.ceil(elapsedMs / 1000));
  const accuracy = calculateSpellingAccuracy(correctCount, questionCount);

  useEffect(() => {
    if (phase !== "playing" || !activeQuestion || questionCompleted) {
      return;
    }

    inputRef.current?.focus();
  }, [activeQuestion, phase, questionCompleted]);

  useEffect(() => {
    if (phase !== "playing" || !questionCompleted) {
      return undefined;
    }

    function handleNextQuestionShortcut(event) {
      if (!isSpellingNextQuestionShortcut(event)) {
        return;
      }

      event.preventDefault();
      moveToNextQuestion();
    }

    document.addEventListener("keydown", handleNextQuestionShortcut);
    return () => document.removeEventListener("keydown", handleNextQuestionShortcut);
  }, [phase, questionCompleted, questionIndex, questionCount]);

  useEffect(() => {
    if (phase !== "complete" || completionCelebratedRef.current) {
      return;
    }

    completionCelebratedRef.current = true;
    void celebration?.playCompletion?.();
  }, [celebration, phase]);

  function startGame() {
    if (!canStart) {
      return;
    }

    const nextQuestions = createSpellingQuestions(spellingItems, {
      usedMasksByWord: usedMasksByWordRef.current,
      lastSignatureByWord: lastMaskSignatureByWordRef.current,
    });

    window.clearTimeout(transitionTimerRef.current);
    completionCelebratedRef.current = false;
    startedAtRef.current = Date.now();
    setQuestions(nextQuestions);
    setQuestionIndex(0);
    setAttemptCount(0);
    setQuestionCompleted(false);
    setScore(0);
    setCorrectCount(0);
    setRevealedCount(0);
    setTotalAttempts(0);
    setCurrentInput("");
    setFeedbackTone("idle");
    setFeedbackMessage("가려진 철자를 보고 영어 단어를 입력해 보세요.");
    setHintState(createSpellingHintState(nextQuestions[0]));
    setElapsedMs(0);
    setPhase("playing");
  }

  function completeCurrentQuestion(outcome, options = {}) {
    setQuestionCompleted(true);
    setFeedbackTone(outcome);

    if (outcome === "correct") {
      setFeedbackMessage(
        options.followUp
          ? `정답을 보고 다시 써서 기억했어요! "${activeQuestion.word}"를 완성했습니다.`
          : `정답입니다! "${activeQuestion.word}"를 정확하게 썼어요.`,
      );
      void celebration?.playSuccess?.();
    } else {
      setFeedbackMessage(`정답은 "${activeQuestion.word}"입니다. 다음 문제에서 다시 도전해 보세요.`);
    }
  }

  function handleRevealHint() {
    if (!activeQuestion || questionCompleted || isSpellingAnswerRevealed(hintState)) {
      return;
    }

    const nextHintState = revealNextSpellingHint(
      activeQuestion,
      hintState ?? createSpellingHintState(activeQuestion),
    );
    setHintState(nextHintState);
    setCurrentInput("");
    setFeedbackTone("hint");
    setFeedbackMessage(
      nextHintState.answerRevealed
        ? `정답이 모두 보였어요. 이제 "${activeQuestion.word}"를 직접 입력해 보세요.`
        : `좋아요! 철자 단서가 늘었어요. 보이는 글자를 참고해 천천히 써 보세요.`,
    );
    inputRef.current?.focus();
  }

  function handleSubmit(event) {
    event?.preventDefault?.();

    if (!activeQuestion || questionCompleted) {
      return;
    }

    const answer = currentInput.trim();
    if (!answer) {
      setFeedbackTone("wrong");
      setFeedbackMessage("먼저 영어 단어를 입력해 주세요.");
      return;
    }

    const nextAttemptCount = attemptCount + 1;
    setAttemptCount(nextAttemptCount);
    setTotalAttempts((current) => current + 1);

    if (isSpellingAnswerCorrect(answer, activeQuestion.word)) {
      setScore((current) => current + calculateSpellingAttemptScore({ attemptsUsed: nextAttemptCount }));
      setCorrectCount((current) => current + 1);
      completeCurrentQuestion("correct", {
        followUp: isSpellingAnswerRevealed(hintState),
      });
      return;
    }

    if (nextAttemptCount >= SPELLING_ATTEMPT_LIMIT) {
      setScore((current) => current + calculateSpellingAttemptScore({ attemptsUsed: nextAttemptCount, revealed: true }));
      setRevealedCount((current) => current + 1);
      completeCurrentQuestion("revealed");
      return;
    }

    setFeedbackTone("wrong");
    setFeedbackMessage(
      isSpellingAnswerRevealed(hintState)
        ? `보이는 철자를 따라 천천히 다시 써 보세요. ${SPELLING_ATTEMPT_LIMIT - nextAttemptCount}번 더 입력할 수 있어요.`
        : `다시 한 번 살펴보고 써 보세요. ${SPELLING_ATTEMPT_LIMIT - nextAttemptCount}번 더 입력할 수 있어요.`,
    );
  }

  function moveToNextQuestion() {
    if (!questionCompleted) {
      return;
    }

    if (questionIndex >= questions.length - 1) {
      setElapsedMs(Math.max(0, Date.now() - startedAtRef.current));
      setPhase("complete");
      return;
    }

    setQuestionIndex((current) => current + 1);
    setAttemptCount(0);
    setQuestionCompleted(false);
    setCurrentInput("");
    setFeedbackTone("idle");
    setFeedbackMessage("가려진 철자를 보고 영어 단어를 입력해 보세요.");
    setHintState(createSpellingHintState(questions[questionIndex + 1]));
  }

  if (phase === "ready") {
    return (
      <WordSpellingStartCard
        canStart={canStart}
        itemCount={spellingItems.length}
        onStart={startGame}
        onBack={onBack}
      />
    );
  }

  if (phase === "complete") {
    return (
      <WordSpellingResultCard
        score={score}
        correctCount={correctCount}
        questionCount={questionCount}
        revealedCount={revealedCount}
        totalAttempts={totalAttempts}
        elapsedSeconds={elapsedSeconds}
        leaderboardContext={leaderboardContext}
        remoteConfigured={remoteConfigured}
        studentNameDraft={studentNameDraft}
        onStudentNameDraftChange={onStudentNameDraftChange}
        onRetry={startGame}
        onBack={onBack}
      />
    );
  }

  const activeHintState = hintState ?? (
    activeQuestion ? createSpellingHintState(activeQuestion) : null
  );
  const maskLabel = activeQuestion
    ? `영어 단어 단서 ${activeHintState?.displayText ?? activeQuestion.mask.displayText}, 뜻은 ${activeQuestion.meaning}`
    : "영어 단어 단서";

  return (
    <section className="workspace-panel word-spelling-shell">
      <div className="section-heading">
        <div>
          <p className="mode-label">Spelling Completion</p>
          <h2>철자 완성 게임</h2>
        </div>
        <button className="ghost-button" type="button" onClick={onBack}>
          홈으로
        </button>
      </div>

      <div className="quiz-grid word-spelling-grid">
        <div className="quiz-main">
          <article className="scoreboard-card word-spelling-scoreboard" aria-label="철자 완성 게임 상태">
            <div>
              <span>현재 문제</span>
              <strong>{questionIndex + 1} / {questionCount}</strong>
            </div>
            <div>
              <span>현재 점수</span>
              <strong>{score}점</strong>
            </div>
            <div>
              <span>남은 기회</span>
              <strong>{Math.max(SPELLING_ATTEMPT_LIMIT - attemptCount, 0)}번</strong>
            </div>
          </article>

          <article
            className="question-card word-spelling-mask-card"
            aria-label={maskLabel}
          >
            <div className="question-head">
              <div>
                <p className="mode-label">Hidden Spelling Clue</p>
                <h3>가려진 철자를 보고 단어를 완성해 보세요</h3>
              </div>
              <span className="word-spelling-attempt-badge">{attemptCount}회 입력</span>
            </div>

            <div className="word-spelling-clue-card">
              <span>영어 단어 단서</span>
              <strong className="word-spelling-mask">
                {activeHintState?.characters.map((character, index) => (
                  <span
                    key={`${activeQuestion.id}-${index}`}
                    className={character.visible ? "word-spelling-mask-character" : "word-spelling-mask-character word-spelling-mask-hidden"}
                  >
                    {character.visible ? character.value : "_"}
                  </span>
                ))}
              </strong>
              <p className="question-copy">뜻: {activeQuestion?.meaning}</p>
              <div className="word-spelling-hint-row">
                <span className="word-spelling-hint-status" aria-live="polite">
                  도움 단계 {Math.min(activeHintState?.level ?? 0, activeHintState?.maxLevel ?? 3)} / {activeHintState?.maxLevel ?? 3}
                </span>
                <button
                  className={
                    "ghost-button word-spelling-hint-button" +
                    (!questionCompleted && !activeHintState?.answerRevealed ? " gi-pulse" : "")
                  }
                  type="button"
                  onClick={handleRevealHint}
                  disabled={questionCompleted || activeHintState?.answerRevealed}
                  aria-label={activeHintState?.answerRevealed
                    ? "정답이 모두 보였습니다. 단어를 직접 입력해 보세요."
                    : "철자 힌트 받기"}
                >
                  {activeHintState?.hintLabel ?? "첫 글자 보여줘"}
                </button>
              </div>
            </div>
          </article>

          <article className="question-card word-spelling-input-card">
            <h3>영어 철자 입력</h3>
            <form className="word-spelling-input-form" onSubmit={handleSubmit}>
              <label className="sr-only" htmlFor="spelling-answer-input">
                영어 철자를 입력하세요
              </label>
              <input
                ref={inputRef}
                id="spelling-answer-input"
                className="word-spelling-textbox"
                type="text"
                value={currentInput}
                onChange={(event) => setCurrentInput(event.target.value)}
                placeholder="영어 철자를 입력하세요"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="done"
                disabled={questionCompleted}
              />
              <button className="primary-button gi-pulse" type="submit" disabled={questionCompleted}>
                입력 확인
              </button>
            </form>
          </article>
        </div>

        <div className="quiz-side">
          <article className="hint-card word-spelling-feedback-card">
            <p className="mode-label">Spelling Feedback</p>
            <h3>입력 결과</h3>
            <div className={`feedback-card word-spelling-feedback word-spelling-feedback-${feedbackTone}`} aria-live="polite">
              <p>{feedbackMessage}</p>
            </div>
            <div className="feedback-meta">
              <span>정답은 한 문제당 세 번까지 입력할 수 있어요.</span>
              <span>어려우면 도움 버튼으로 철자를 한 단계씩 더 확인할 수 있어요.</span>
              <span>결과가 나오면 Enter를 한 번 더 눌러 다음 문제로 이동할 수 있어요.</span>
            </div>
          </article>

          <article className="hint-card word-spelling-tip-card">
            <p className="mode-label">Spelling Progress</p>
            <h3>진행 상황</h3>
            <div className="progression-metrics">
              <div className="progression-metric">
                <span>맞힌 문제</span>
                <strong>{correctCount}개</strong>
              </div>
              <div className="progression-metric">
                <span>정확도</span>
                <strong>{accuracy}%</strong>
              </div>
            </div>
          </article>

        </div>
      </div>

      <div className="toolbar-row">
        <button
          className={`primary-button${questionCompleted ? " gi-pulse" : ""}`}
          type="button"
          onClick={moveToNextQuestion}
          disabled={!questionCompleted}
          aria-keyshortcuts="Enter"
        >
          {questionIndex >= questionCount - 1 ? "결과 보기" : "다음 문제"}
        </button>
      </div>
    </section>
  );
}
