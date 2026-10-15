import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { ResultSummary } from "./ResultSummary.jsx";
import {
  buildSessionReviewItems,
  registerSessionReviewMiss,
} from "../utils/sessionReview.js";
import { TypingStartCard } from "./typing/TypingStartCard.jsx";
import { TypingPlayCard } from "./typing/TypingPlayCard.jsx";
import { TypingResultCard } from "./typing/TypingResultCard.jsx";
import {
  calculateTypingAverageSeconds,
  calculateTypingScore,
  isTypingAnswerCorrect,
  normalizeTypingItems,
} from "../utils/wordTyping.js";

const ATTEMPT_LIMIT = 3;
const NEXT_QUESTION_DELAY_MS = 800;
const FAILED_QUESTION_DELAY_MS = 1100;
const SESSION_REVIEW_LIMIT = 3;

function shuffleItems(items) {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]];
  }

  return nextItems;
}

export function WordTypingGame({
  items,
  speech,
  celebration,
  leaderboardContext,
  progressionContext,
  remoteConfigured,
  studentNameDraft,
  onStudentNameDraftChange,
  onBack,
}) {
  const typingItems = useMemo(() => normalizeTypingItems(items), [items]);
  const inputRef = useRef(null);
  const questionStartRef = useRef(0);
  const transitionTimerRef = useRef(null);
  const completionCelebratedRef = useRef(false);
  const announcedQuestionIdRef = useRef("");
  const transitionLockedRef = useRef(false);

  const [phase, setPhase] = useState("ready");
  const [questions, setQuestions] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [hintUsedIds, setHintUsedIds] = useState([]);
  const [currentInput, setCurrentInput] = useState("");
  const [feedbackTone, setFeedbackTone] = useState("idle");
  const [feedbackMessage, setFeedbackMessage] = useState(
    "뜻을 보고, 발음을 들은 뒤 영어 단어를 정확하게 입력해 보세요.",
  );
  const [elapsedMs, setElapsedMs] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [reviewEntries, setReviewEntries] = useState([]);
  const [reviewItems, setReviewItems] = useState([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewScore, setReviewScore] = useState(0);
  const [reviewSummary, setReviewSummary] = useState(null);
  const [reviewHintUsedIds, setReviewHintUsedIds] = useState([]);

  useEffect(() => {
    speech.cancel();
    window.clearTimeout(transitionTimerRef.current);
    transitionLockedRef.current = false;
    announcedQuestionIdRef.current = "";
    completionCelebratedRef.current = false;
    setPhase("ready");
    setQuestions([]);
    setQuestionIndex(0);
    setAttemptCount(0);
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setHintUsedIds([]);
    setCurrentInput("");
    setFeedbackTone("idle");
    setFeedbackMessage("뜻을 보고, 발음을 들은 뒤 영어 단어를 정확하게 입력해 보세요.");
    setElapsedMs(0);
    setCorrectCount(0);
    setFailedCount(0);
    setReviewEntries([]);
    setReviewItems([]);
    setReviewIndex(0);
    setReviewScore(0);
    setReviewSummary(null);
    setReviewHintUsedIds([]);
  }, [items, speech.cancel]);

  useEffect(() => {
    return () => {
      speech.cancel();
      window.clearTimeout(transitionTimerRef.current);
    };
  }, [speech.cancel]);

  const canStart = typingItems.length > 0;
  const currentQuestion = questions[questionIndex] ?? null;
  const reviewQuestion = reviewItems[reviewIndex] ?? null;
  const isReviewPhase = phase === "review";
  const isReviewComplete = phase === "review-complete";
  const activeQuestion = isReviewPhase ? reviewQuestion : currentQuestion;
  const completedCount = correctCount + failedCount;
  const questionCount = questions.length;
  const progressValue = phase === "complete" ? questionCount : completedCount;
  const reviewProgressValue =
    reviewIndex + (feedbackTone === "correct" || feedbackTone === "failed" ? 1 : 0);
  const availableReviewItems = useMemo(
    () => buildSessionReviewItems(reviewEntries, SESSION_REVIEW_LIMIT),
    [reviewEntries],
  );
  const hintUsed = activeQuestion
    ? isReviewPhase
      ? reviewHintUsedIds.includes(activeQuestion.id)
      : hintUsedIds.includes(activeQuestion.id)
    : false;
  const averageSeconds = calculateTypingAverageSeconds(elapsedMs, completedCount || 1);
  const elapsedSeconds = Math.max(0, Math.ceil(elapsedMs / 1000));
  const accuracy = questionCount > 0 ? Math.round((correctCount / questionCount) * 100) : 0;

  const speakCurrentWord = useEffectEvent(() => {
    if (!activeQuestion) {
      return;
    }

    speech.speak(activeQuestion.word, {
      lang: "en-US",
      rate: 0.88,
    });
  });

  const moveToNextQuestion = useEffectEvent((delayMs) => {
    window.clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = window.setTimeout(() => {
      if (questionIndex >= questions.length - 1) {
        speech.cancel();
        transitionLockedRef.current = false;
        setPhase("complete");
        return;
      }

      transitionLockedRef.current = false;
      announcedQuestionIdRef.current = "";
      setQuestionIndex((current) => current + 1);
      setAttemptCount(0);
      setCurrentInput("");
      setFeedbackTone("idle");
      setFeedbackMessage("뜻을 보고, 발음을 들은 뒤 영어 단어를 정확하게 입력해 보세요.");
    }, delayMs);
  });

  const moveToNextReviewQuestion = useEffectEvent((delayMs) => {
    window.clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = window.setTimeout(() => {
      if (reviewIndex >= reviewItems.length - 1) {
        speech.cancel();
        transitionLockedRef.current = false;
        setReviewSummary({
          total: reviewItems.length,
          correctedCount: reviewScore,
        });
        setPhase("review-complete");
        return;
      }

      transitionLockedRef.current = false;
      announcedQuestionIdRef.current = "";
      setReviewIndex((current) => current + 1);
      setAttemptCount(0);
      setCurrentInput("");
      setFeedbackTone("idle");
      setFeedbackMessage("뜻을 보고, 발음을 들은 뒤 영어 단어를 정확하게 입력해 보세요.");
    }, delayMs);
  });

  useEffect(() => {
    if ((phase !== "playing" && phase !== "review") || !activeQuestion) {
      return;
    }

    const announcementKey = `${phase}:${activeQuestion.id}`;

    if (announcedQuestionIdRef.current === announcementKey) {
      return;
    }

    announcedQuestionIdRef.current = announcementKey;
    questionStartRef.current = Date.now();
    speakCurrentWord();
    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select?.();
    }, 0);
  }, [activeQuestion, phase, speakCurrentWord]);

  useEffect(() => {
    if (phase !== "complete" || completionCelebratedRef.current) {
      return;
    }

    completionCelebratedRef.current = true;
    void celebration?.playCompletion?.();
  }, [celebration, phase]);

  function startGame() {
    if (!canStart || !speech.supported) {
      return;
    }

    speech.cancel();
    window.clearTimeout(transitionTimerRef.current);
    transitionLockedRef.current = false;
    announcedQuestionIdRef.current = "";
    completionCelebratedRef.current = false;
    setQuestions(shuffleItems(typingItems));
    setQuestionIndex(0);
    setAttemptCount(0);
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setHintUsedIds([]);
    setCurrentInput("");
    setFeedbackTone("idle");
    setFeedbackMessage("뜻을 보고, 발음을 들은 뒤 영어 단어를 정확하게 입력해 보세요.");
    setElapsedMs(0);
    setCorrectCount(0);
    setFailedCount(0);
    setReviewEntries([]);
    setReviewItems([]);
    setReviewIndex(0);
    setReviewScore(0);
    setReviewSummary(null);
    setReviewHintUsedIds([]);
    setPhase("playing");
  }

  function handleShowHint() {
    if (!activeQuestion || hintUsed || transitionLockedRef.current) {
      return;
    }

    if (isReviewPhase) {
      setReviewHintUsedIds((current) => [...current, activeQuestion.id]);
    } else {
      setHintUsedIds((current) => [...current, activeQuestion.id]);
    }
    setFeedbackTone("idle");
    setFeedbackMessage("힌트를 참고해서 다시 입력해 보세요.");
  }

  function handleSubmit(event) {
    event?.preventDefault?.();

    if (!activeQuestion || transitionLockedRef.current) {
      return;
    }

    const answer = currentInput.trim();
    if (!answer) {
      setFeedbackTone("wrong");
      setFeedbackMessage("먼저 영어 단어를 입력해 주세요.");
      return;
    }

    const answerSeconds = Math.max(0, (Date.now() - questionStartRef.current) / 1000);
    const nextAttemptCount = attemptCount + 1;

    if (isTypingAnswerCorrect(answer, activeQuestion.word)) {
      if (isReviewPhase) {
        transitionLockedRef.current = true;
        setReviewScore((current) => current + 1);
        setFeedbackTone("correct");
        setFeedbackMessage(`정답입니다! "${activeQuestion.word}"를 정확하게 다시 썼어요.`);
        void celebration?.playSuccess?.();
        moveToNextReviewQuestion(NEXT_QUESTION_DELAY_MS);
        return;
      }

      const nextCombo = combo + 1;
      const gainedScore = calculateTypingScore({
        attemptsUsed: nextAttemptCount,
        answerSeconds,
        usedHint: hintUsed,
        combo: nextCombo,
      });

      transitionLockedRef.current = true;
      setElapsedMs((current) => current + answerSeconds * 1000);
      setScore((current) => current + gainedScore);
      setCorrectCount((current) => current + 1);
      setCombo(nextCombo);
      setBestCombo((current) => Math.max(current, nextCombo));
      setFeedbackTone("correct");
      setFeedbackMessage(`정답입니다! "${activeQuestion.word}"를 정확하게 썼어요.`);
      void celebration?.playSuccess?.();
      moveToNextQuestion(NEXT_QUESTION_DELAY_MS);
      return;
    }

    setAttemptCount(nextAttemptCount);

    if (nextAttemptCount >= ATTEMPT_LIMIT) {
      transitionLockedRef.current = true;

      if (isReviewPhase) {
        setFeedbackTone("failed");
        setFeedbackMessage(`아쉽지만 이번 복습 문제의 정답은 "${activeQuestion.word}"입니다.`);
        moveToNextReviewQuestion(FAILED_QUESTION_DELAY_MS);
        return;
      }

      setElapsedMs((current) => current + answerSeconds * 1000);
      setFailedCount((current) => current + 1);
      setCombo(0);
      setFeedbackTone("failed");
      setFeedbackMessage(`아쉽지만 이번 문제의 정답은 "${activeQuestion.word}"입니다.`);
      setReviewEntries((current) =>
        registerSessionReviewMiss(current, activeQuestion, "typing"),
      );
      moveToNextQuestion(FAILED_QUESTION_DELAY_MS);
      return;
    }

    setFeedbackTone("wrong");
    setFeedbackMessage(`다시 한 번 써 보세요. ${ATTEMPT_LIMIT - nextAttemptCount}번 더 입력할 수 있어요.`);
  }

  function startReview() {
    if (availableReviewItems.length === 0) {
      return;
    }

    speech.cancel();
    window.clearTimeout(transitionTimerRef.current);
    transitionLockedRef.current = false;
    announcedQuestionIdRef.current = "";
    setReviewItems(availableReviewItems);
    setReviewIndex(0);
    setReviewScore(0);
    setReviewSummary(null);
    setReviewHintUsedIds([]);
    setAttemptCount(0);
    setCurrentInput("");
    setFeedbackTone("idle");
    setFeedbackMessage("뜻을 보고, 발음을 들은 뒤 영어 단어를 정확하게 입력해 보세요.");
    setPhase("review");
  }

  function returnToResult() {
    speech.cancel();
    window.clearTimeout(transitionTimerRef.current);
    transitionLockedRef.current = false;
    announcedQuestionIdRef.current = "";
    setAttemptCount(0);
    setCurrentInput("");
    setFeedbackTone("idle");
    setFeedbackMessage("뜻을 보고, 발음을 들은 뒤 영어 단어를 정확하게 입력해 보세요.");
    setPhase("complete");
  }

  if (phase === "ready") {
    return (
      <TypingStartCard
        canStart={canStart}
        ttsSupported={speech.supported}
        itemCount={typingItems.length}
        onStart={startGame}
        onBack={onBack}
      />
    );
  }

  if (phase === "complete") {
    return (
      <TypingResultCard
        score={score}
        correctCount={correctCount}
        failedCount={failedCount}
        questionCount={questionCount}
        elapsedSeconds={elapsedSeconds}
        hintUsedCount={hintUsedIds.length}
        averageSeconds={averageSeconds}
        bestCombo={bestCombo}
        accuracy={accuracy}
        leaderboardContext={leaderboardContext}
        progressionContext={progressionContext}
        remoteConfigured={remoteConfigured}
        studentNameDraft={studentNameDraft}
        onStudentNameDraftChange={onStudentNameDraftChange}
        hasReviewAvailable={availableReviewItems.length > 0}
        reviewCount={availableReviewItems.length}
        reviewSummary={reviewSummary}
        onStartReview={startReview}
        onRetry={startGame}
        onBack={onBack}
      />
    );
  }

  if (isReviewComplete) {
    return (
      <section className="workspace-panel word-typing-shell">
        <div className="section-heading">
          <div>
            <p className="mode-label">Typing Review</p>
            <h2>영어 단어 타자 오답 복습 완료</h2>
          </div>
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>

        <ResultSummary
          title="타자 오답 복습 완료"
          score={reviewSummary?.correctedCount ?? 0}
          total={reviewSummary?.total ?? 0}
          summaryCopy={`틀린 단어 ${reviewSummary?.total ?? 0}개 중 ${reviewSummary?.correctedCount ?? 0}개를 바로 다시 썼어요.`}
          extraContent={
            <article className="session-review-summary-card">
              <p className="mode-label">Session Review</p>
              <h4>헷갈렸던 철자를 바로 복습했어요</h4>
              <div className="session-review-progress">
                <span>복습 문제</span>
                <strong>{reviewSummary?.total ?? 0}개</strong>
              </div>
              <div className="session-review-progress">
                <span>다시 맞힌 문제</span>
                <strong>{reviewSummary?.correctedCount ?? 0}개</strong>
              </div>
            </article>
          }
          footerContent={
            <div className="toolbar-row">
              <button className="primary-button" onClick={returnToResult}>
                결과 다시 보기
              </button>
              <button className="ghost-button" onClick={onBack}>
                홈으로
              </button>
            </div>
          }
          onRetry={returnToResult}
          onBack={onBack}
        />
      </section>
    );
  }

      <TypingPlayCard
        isReviewPhase={isReviewPhase}
        onBack={onBack}
        reviewIndex={reviewIndex}
        reviewItems={reviewItems}
        reviewScore={reviewScore}
        questionIndex={questionIndex}
        questions={questions}
        score={score}
        combo={combo}
        attemptCount={attemptCount}
        attemptLimit={ATTEMPT_LIMIT}
        bestCombo={bestCombo}
        reviewProgressValue={reviewProgressValue}
        progressValue={progressValue}
        activeQuestion={activeQuestion}
        speech={speech}
        speakCurrentWord={speakCurrentWord}
        inputRef={inputRef}
        currentInput={currentInput}
        setCurrentInput={setCurrentInput}
        transitionLockedRef={transitionLockedRef}
        handleSubmit={handleSubmit}
        handleShowHint={handleShowHint}
        hintUsed={hintUsed}
        feedbackTone={feedbackTone}
        feedbackMessage={feedbackMessage}
        completedCount={completedCount}
        averageSeconds={averageSeconds}
      />
}
