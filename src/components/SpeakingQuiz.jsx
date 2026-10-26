import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition.js";
import { useMissReporting } from "./progression/useMissReporting.js";
import { SpeakingQuestionCard } from "./speaking/SpeakingQuestionCard.jsx";
import { ActivityProgressionBlock } from "./progression/ActivityProgressionBlock.jsx";
import {
  buildSpeakingReviewCard,
  SpeakingCompleteScreen,
  SpeakingEmptyNotice,
  SpeakingReviewCompleteScreen,
  SpeakingUnsupportedNotice,
} from "./speaking/SpeakingResultScreens.jsx";
import { SpeakingReviewCard } from "./speaking/SpeakingReviewCard.jsx";
import { OfflineSpeechFallback } from "./speaking/OfflineSpeechFallback.jsx";
import { useSpeakingGrading } from "./speaking/useSpeakingGrading.js";
import { useActivityProgression } from "./progression/useActivityProgression.js";
import { getGuidance } from "./speaking/speakingMessages.js";
import { createSpeakingSequence } from "../utils/quiz.js";
import {
  buildSessionReviewItems,
  registerSessionReviewMiss,
} from "../utils/sessionReview.js";
import { canAdvanceSpeakingQuestion } from "../utils/speakingAttempts.js";

const SESSION_REVIEW_LIMIT = 3;

export function SpeakingQuiz({
  items,
  remoteConfigured,
  progressionContext,
  studentNameDraft,
  onStudentNameDraftChange,
  speech,
  celebration,
  onBack,
  studentGrade,
}) {
  const [questions, setQuestions] = useState(() =>
    createSpeakingSequence(items),
  );
  const vocabularyWords = useMemo(
    () => questions.map((item) => String(item?.word ?? "")).filter(Boolean),
    [questions],
  );
  const vocabularyKey = vocabularyWords.join("|");
  const recognition = useSpeechRecognition({
    lang: "en-US",
    maxAlternatives: 3,
    interimResults: true,
    vocabulary: vocabularyWords,
    vocabularyKey,
  });
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState("idle");
  const [attemptTranscript, setAttemptTranscript] = useState("");
  const [celebratedQuestionId, setCelebratedQuestionId] = useState("");
  const [completionCelebrated, setCompletionCelebrated] = useState(false);
  const {
    progressionLoading,
    progressionStatus,
    progressionError,
    progressionComparison,
    newlyEarnedBadges,
    hasSavedProgress,
    progressionDisabledReason,
    handleSaveProgress,
    resetProgression,
  } = useActivityProgression({
    remoteConfigured,
    progressionContext,
    studentNameDraft,
    onStudentNameDraftChange,
    score,
    activityType: "speaking",
    activityNoun: "말하기",
  });
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [blockingError, setBlockingError] = useState("");
  const [reviewEntries, setReviewEntries] = useState([]);
  const [reviewPhase, setReviewPhase] = useState("idle");
  const [reviewItems, setReviewItems] = useState([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewScore, setReviewScore] = useState(0);
  const [reviewStatus, setReviewStatus] = useState("idle");
  const [reviewAttemptTranscript, setReviewAttemptTranscript] = useState("");
  const [reviewFailedAttempts, setReviewFailedAttempts] = useState(0);
  const [reviewBlockingError, setReviewBlockingError] = useState("");
  const [reviewSummary, setReviewSummary] = useState(null);

  function resetQuestionFailureState() {
    setFailedAttempts(0);
    setBlockingError("");
  }

  function resetReviewQuestionFailureState() {
    setReviewFailedAttempts(0);
    setReviewBlockingError("");
  }

  const resetSpeakingGame = useEffectEvent(() => {
    setQuestions(createSpeakingSequence(items));
    setQuestionIndex(0);
    setScore(0);
    setStatus("idle");
    setAttemptTranscript("");
    setCelebratedQuestionId("");
    setCompletionCelebrated(false);
    resetProgression();
    resetQuestionFailureState();
    setReviewEntries([]);
    setReviewPhase("idle");
    setReviewItems([]);
    setReviewIndex(0);
    setReviewScore(0);
    setReviewStatus("idle");
    setReviewAttemptTranscript("");
    resetReviewQuestionFailureState();
    setReviewSummary(null);
    recognition.reset();
  });

  useEffect(() => {
    resetSpeakingGame();
  }, [items, resetProgression]);

  const { warmup } = speech ?? {};

  useEffect(() => {
    warmup?.();
  }, [warmup]);

  const totalQuestions = questions.length;
  const question = questions[questionIndex];
  const reviewQuestion = reviewItems[reviewIndex];
  const isReviewPlaying = reviewPhase === "playing";
  const isReviewComplete = reviewPhase === "complete";
  const isComplete = status === "complete";
  const canAdvance = canAdvanceSpeakingQuestion({
    status,
    failedAttempts,
    blockingError,
  });
  const isLockedAfterCorrect = status === "correct";
  const canAdvanceReview = canAdvanceSpeakingQuestion({
    status: reviewStatus,
    failedAttempts: reviewFailedAttempts,
    blockingError: reviewBlockingError,
  });
  const guidance = getGuidance(recognition.error, recognition.browserName);
  const reviewGuidance = getGuidance(reviewBlockingError || recognition.error, recognition.browserName);
  const availableReviewItems = useMemo(
    () => buildSessionReviewItems(reviewEntries, SESSION_REVIEW_LIMIT),
    [reviewEntries],
  );
  const hasReviewAvailable = recognition.supported && availableReviewItems.length > 0;
  const reviewCard = buildSpeakingReviewCard({
    reviewSummary,
    hasReviewAvailable,
    availableReviewItems,
    onStartReview: handleStartReview,
    onBack,
  });

  useSpeakingGrading({
    recognition,
    isReviewPlaying,
    question,
    reviewQuestion,
    actions: {
      setReviewAttemptTranscript,
      resetReviewQuestionFailureState,
      setReviewStatus,
      setReviewScore,
      setReviewBlockingError,
      setReviewFailedAttempts,
      setAttemptTranscript,
      resetQuestionFailureState,
      setStatus,
      setScore,
      setBlockingError,
      setFailedAttempts,
    },
  });

  useEffect(() => {
    if (status !== "correct" || !question) {
      return;
    }

    if (celebratedQuestionId === question.id) {
      return;
    }

    setCelebratedQuestionId(question.id);
    void celebration?.playSuccess?.();
  }, [celebratedQuestionId, celebration, question, status]);

  useEffect(() => {
    if (!isComplete || completionCelebrated) {
      return;
    }

    setCompletionCelebrated(true);
    void celebration?.playCompletion?.();
  }, [celebration, completionCelebrated, isComplete]);

  useMissReporting({
    resetKey: items,
    isComplete,
    availableReviewItems,
    progressionContext,
    remoteConfigured,
    activityType: "speaking",
  });

  function handleStartListening() {
    if (!recognition.supported) {
      return;
    }

    if (isReviewPlaying) {
      if (reviewStatus === "correct") {
        return;
      }

      setReviewStatus("idle");
      setReviewAttemptTranscript("");
      setReviewBlockingError("");
      recognition.reset();
      recognition.start();
      return;
    }

    if (isLockedAfterCorrect) {
      return;
    }

    setStatus("idle");
    setAttemptTranscript("");
    recognition.reset();
    recognition.start();
  }

  function handleReplayWord() {
    const targetQuestion = isReviewPlaying ? reviewQuestion : question;

    if (!targetQuestion) {
      return;
    }

    speech.speak(targetQuestion.word, {
      lang: "en-US",
    });
  }

  function handleNext() {
    recognition.stop();
    recognition.reset();
    resetQuestionFailureState();

    if (status !== "correct" && question) {
      setReviewEntries((current) =>
        registerSessionReviewMiss(current, question, "speaking"),
      );
    }

    if (questionIndex === totalQuestions - 1) {
      setStatus("complete");
      return;
    }

    setQuestionIndex((current) => current + 1);
    setStatus("idle");
    setAttemptTranscript("");
    setCelebratedQuestionId("");
  }

  function handleRetry() {
    setQuestions(createSpeakingSequence(items));
    setQuestionIndex(0);
    setScore(0);
    setStatus("idle");
    setAttemptTranscript("");
    setCelebratedQuestionId("");
    setCompletionCelebrated(false);
    resetProgression();
    resetQuestionFailureState();
    setReviewEntries([]);
    setReviewPhase("idle");
    setReviewItems([]);
    setReviewIndex(0);
    setReviewScore(0);
    setReviewStatus("idle");
    setReviewAttemptTranscript("");
    resetReviewQuestionFailureState();
    setReviewSummary(null);
    recognition.stop();
    recognition.reset();
  }

  function handleTryAgain() {
    setStatus("idle");
    setAttemptTranscript("");
    setBlockingError("");
    recognition.reset();
  }

  function handleStartReview() {
    if (!hasReviewAvailable) {
      return;
    }

    recognition.stop();
    recognition.reset();
    setReviewItems(createSpeakingSequence(availableReviewItems));
    setReviewIndex(0);
    setReviewScore(0);
    setReviewStatus("idle");
    setReviewAttemptTranscript("");
    resetReviewQuestionFailureState();
    setReviewSummary(null);
    setReviewPhase("playing");
  }

  function handleResetReviewAttempt() {
    setReviewStatus("idle");
    setReviewAttemptTranscript("");
    setReviewBlockingError("");
    recognition.reset();
  }

  function handleNextReviewQuestion() {
    recognition.stop();
    recognition.reset();
    resetReviewQuestionFailureState();

    if (reviewIndex === reviewItems.length - 1) {
      setReviewSummary({
        total: reviewItems.length,
        correctedCount: reviewScore,
      });
      setReviewPhase("complete");
      return;
    }

    setReviewIndex((current) => current + 1);
    setReviewStatus("idle");
    setReviewAttemptTranscript("");
  }

  function handleReturnToResult() {
    recognition.stop();
    recognition.reset();
    setReviewPhase("idle");
  }

  const progressionContent = (
    <ActivityProgressionBlock
      title="말하기 성장 기록"
      studentNameDraft={studentNameDraft}
      onStudentNameDraftChange={onStudentNameDraftChange}
      progressionLoading={progressionLoading}
      hasSavedProgress={hasSavedProgress}
      progressionStatus={progressionStatus}
      progressionError={progressionError}
      progressionComparison={progressionComparison}
      newlyEarnedBadges={newlyEarnedBadges}
      progressionDisabledReason={progressionDisabledReason}
      onSaveProgress={handleSaveProgress}
      reviewCard={reviewCard}
    />
  );

  if (items.length === 0) {
    return <SpeakingEmptyNotice onBack={onBack} />;
  }

  if (!recognition.supported) {
    return (
      <>
        <SpeakingUnsupportedNotice onBack={onBack} />
        <section className="workspace-panel">
          <OfflineSpeechFallback expectedWord={question?.word ?? ""} />
        </section>
      </>
    );
  }

  if (isReviewComplete) {
    return (
      <SpeakingReviewCompleteScreen
        reviewSummary={reviewSummary}
        onReturnToResult={handleReturnToResult}
        onBack={onBack}
      />
    );
  }

  if (isReviewPlaying) {
    return (
      <section className="workspace-panel">
        <div className="section-heading">
          <div>
            <p className="mode-label">Speaking Review</p>
            <h2>방금 틀린 단어 다시 말하기</h2>
          </div>
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>

        <SpeakingReviewCard
          reviewIndex={reviewIndex}
          reviewItems={reviewItems}
          reviewScore={reviewScore}
          reviewStatus={reviewStatus}
          reviewQuestion={reviewQuestion}
          reviewAttemptTranscript={reviewAttemptTranscript}
          reviewGuidance={reviewGuidance}
          speech={speech}
          recognition={recognition}
          canAdvanceReview={canAdvanceReview}
          onReplayWord={handleReplayWord}
          onStartListening={handleStartListening}
          onResetReviewAttempt={handleResetReviewAttempt}
          onNextReviewQuestion={handleNextReviewQuestion}
        />
      </section>
    );
  }

  if (isComplete) {
    return (
      <SpeakingCompleteScreen
        score={score}
        totalQuestions={totalQuestions}
        progressionContent={progressionContent}
        onRetry={handleRetry}
        onBack={onBack}
      />
    );
  }

  return (
    <section className="workspace-panel">
      <div className="section-heading">
        <div>
          <p className="mode-label">Speaking Quiz</p>
          <h2>보고 말하기</h2>
        </div>
        <button className="ghost-button" onClick={onBack}>
          홈으로
        </button>
      </div>

      <SpeakingQuestionCard
        questionIndex={questionIndex}
        totalQuestions={totalQuestions}
        score={score}
        status={status}
        question={question}
        speech={speech}
        studentGrade={studentGrade}
        recognition={recognition}
        attemptTranscript={attemptTranscript}
        guidance={guidance}
        isLockedAfterCorrect={isLockedAfterCorrect}
        canAdvance={canAdvance}
        onReplayWord={handleReplayWord}
        onStartListening={handleStartListening}
        onTryAgain={handleTryAgain}
        onNext={handleNext}
      />
    </section>
  );
}
