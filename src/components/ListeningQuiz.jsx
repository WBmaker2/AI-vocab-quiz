import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { createListeningQuestions } from "../utils/quiz.js";
import { useMissReporting } from "./progression/useMissReporting.js";
import { ListeningQuestionCard } from "./listening/ListeningQuestionCard.jsx";
import {
  buildListeningReviewCard,
  ListeningCompleteScreen,
  ListeningEmptyNotice,
  ListeningReviewCompleteScreen,
} from "./listening/ListeningResultScreens.jsx";
import { ListeningReviewCard } from "./listening/ListeningReviewCard.jsx";
import { ActivityProgressionBlock } from "./progression/ActivityProgressionBlock.jsx";
import { useActivityProgression } from "./progression/useActivityProgression.js";
import { getListeningAnnouncementWord } from "../utils/listeningQuiz.js";
import {
  buildSessionReviewItems,
  registerSessionReviewMiss,
} from "../utils/sessionReview.js";

const SESSION_REVIEW_LIMIT = 3;

export function ListeningQuiz({
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
    createListeningQuestions(items),
  );
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [status, setStatus] = useState("idle");
  const announcedQuestionIdRef = useRef("");
  const celebratedQuestionIdRef = useRef("");
  const completionCelebratedRef = useRef(false);
  const {
    progressionLoading,
    progressionStatus,
    progressionError,
    progressionComparison,
    newlyEarnedBadges,
    progressionStudentName,
    hasSavedProgress,
    progressionDisabledReason,
    handleSaveProgress,
    resetProgression,
    setProgressionStatus,
    setProgressionError,
    setProgressionComparison,
    setNewlyEarnedBadges,
    setProgressionStudentName,
  } = useActivityProgression({
    remoteConfigured,
    progressionContext,
    studentNameDraft,
    onStudentNameDraftChange,
    score,
    activityType: "listening",
    activityNoun: "듣기",
  });
  const [reviewEntries, setReviewEntries] = useState([]);
  const [reviewPhase, setReviewPhase] = useState("idle");
  const [reviewQuestions, setReviewQuestions] = useState([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewScore, setReviewScore] = useState(0);
  const [reviewSelectedAnswer, setReviewSelectedAnswer] = useState("");
  const [reviewStatus, setReviewStatus] = useState("idle");
  const [reviewSummary, setReviewSummary] = useState(null);

  useEffect(() => {
    setQuestions(createListeningQuestions(items));
    setQuestionIndex(0);
    setScore(0);
    setSelectedAnswer("");
    setStatus("idle");
    announcedQuestionIdRef.current = "";
    celebratedQuestionIdRef.current = "";
    completionCelebratedRef.current = false;
    resetProgression();
    setReviewEntries([]);
    setReviewPhase("idle");
    setReviewQuestions([]);
    setReviewIndex(0);
    setReviewScore(0);
    setReviewSelectedAnswer("");
    setReviewStatus("idle");
    setReviewSummary(null);
  }, [items]);

  const totalQuestions = questions.length;
  const question = questions[questionIndex];
  const reviewQuestion = reviewQuestions[reviewIndex];
  const isReviewPlaying = reviewPhase === "playing";
  const isReviewComplete = reviewPhase === "complete";
  const isComplete = status === "complete";
  const hasAnswered = status === "correct" || status === "incorrect";
  const hasReviewAnswered = reviewStatus === "correct" || reviewStatus === "incorrect";
  const availableReviewItems = useMemo(
    () => buildSessionReviewItems(reviewEntries, SESSION_REVIEW_LIMIT),
    [reviewEntries],
  );
  const reviewCard = buildListeningReviewCard({
    reviewSummary,
    availableReviewItems,
    onStartReview: handleStartReview,
    onBack,
  });

  const announceQuestion = useEffectEvent((targetQuestion) => {
    const announcementWord = getListeningAnnouncementWord(targetQuestion, question);

    if (!announcementWord) {
      return;
    }

    speech.speak(announcementWord, {
      lang: "en-US",
    });
  });

  useEffect(() => {
    const targetQuestion = isReviewPlaying ? reviewQuestion : question;

    if (!targetQuestion || isComplete || isReviewComplete) {
      return;
    }

    const announcementKey = `${isReviewPlaying ? "review" : "main"}:${targetQuestion.id}`;

    if (announcedQuestionIdRef.current === announcementKey) {
      return;
    }

    announcedQuestionIdRef.current = announcementKey;
    announceQuestion(targetQuestion);
  }, [announceQuestion, isComplete, isReviewComplete, isReviewPlaying, question, reviewQuestion]);

  const { warmup } = speech ?? {};

  useEffect(() => {
    warmup?.();
  }, [warmup]);

  useEffect(() => {
    if (status !== "correct" || !question) {
      return;
    }

    if (celebratedQuestionIdRef.current === question.id) {
      return;
    }

    celebratedQuestionIdRef.current = question.id;
    void celebration?.playSuccess?.();
  }, [celebration, question, status]);

  useEffect(() => {
    if (!isComplete || completionCelebratedRef.current) {
      return;
    }

    completionCelebratedRef.current = true;
    void celebration?.playCompletion?.();
  }, [celebration, isComplete]);

  useMissReporting({
    resetKey: items,
    isComplete,
    availableReviewItems,
    progressionContext,
    remoteConfigured,
    activityType: "listening",
  });

  function handleSelectChoice(choice) {
    if (!question || hasAnswered) {
      return;
    }

    const isCorrect = choice === question.meaning;
    setSelectedAnswer(choice);
    setStatus(isCorrect ? "correct" : "incorrect");

    if (isCorrect) {
      setScore((current) => current + 1);
      return;
    }

    setReviewEntries((current) =>
      registerSessionReviewMiss(current, question, "listening"),
    );
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
    announcedQuestionIdRef.current = "";
    celebratedQuestionIdRef.current = "";
  }

  function handleRetry() {
    setQuestions(createListeningQuestions(items));
    setQuestionIndex(0);
    setScore(0);
    setSelectedAnswer("");
    setStatus("idle");
    announcedQuestionIdRef.current = "";
    celebratedQuestionIdRef.current = "";
    completionCelebratedRef.current = false;
    resetProgression();
    setReviewEntries([]);
    setReviewPhase("idle");
    setReviewQuestions([]);
    setReviewIndex(0);
    setReviewScore(0);
    setReviewSelectedAnswer("");
    setReviewStatus("idle");
    setReviewSummary(null);
  }

  function handleStartReview() {
    if (availableReviewItems.length === 0) {
      return;
    }

    speech.cancel();
    announcedQuestionIdRef.current = "";
    setReviewQuestions(createListeningQuestions(availableReviewItems, items));
    setReviewIndex(0);
    setReviewScore(0);
    setReviewSelectedAnswer("");
    setReviewStatus("idle");
    setReviewSummary(null);
    setReviewPhase("playing");
  }

  function handleSelectReviewChoice(choice) {
    if (!reviewQuestion || hasReviewAnswered) {
      return;
    }

    const isCorrect = choice === reviewQuestion.meaning;
    setReviewSelectedAnswer(choice);
    setReviewStatus(isCorrect ? "correct" : "incorrect");

    if (isCorrect) {
      setReviewScore((current) => current + 1);
      void celebration?.playSuccess?.();
    }
  }

  function handleNextReviewQuestion() {
    if (!reviewQuestion) {
      return;
    }

    if (reviewIndex === reviewQuestions.length - 1) {
      setReviewSummary({
        total: reviewQuestions.length,
        correctedCount: reviewScore,
      });
      setReviewPhase("complete");
      speech.cancel();
      return;
    }

    setReviewIndex((current) => current + 1);
    setReviewSelectedAnswer("");
    setReviewStatus("idle");
    announcedQuestionIdRef.current = "";
  }

  function handleReturnToResult() {
    setReviewPhase("idle");
  }

  const progressionContent = (
    <ActivityProgressionBlock
      title="듣기 성장 기록"
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
    return <ListeningEmptyNotice onBack={onBack} />;
  }

  if (isReviewComplete) {
    return (
      <ListeningReviewCompleteScreen
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
            <p className="mode-label">Listening Review</p>
            <h2>방금 틀린 문제 다시 풀기</h2>
          </div>
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>

        <ListeningReviewCard
          reviewIndex={reviewIndex}
          reviewQuestions={reviewQuestions}
          reviewScore={reviewScore}
          hasReviewAnswered={hasReviewAnswered}
          reviewQuestion={reviewQuestion}
          reviewSelectedAnswer={reviewSelectedAnswer}
          reviewStatus={reviewStatus}
          speech={speech}
          studentGrade={studentGrade}
          onReplay={() => announceQuestion(reviewQuestion)}
          onSelectReviewChoice={handleSelectReviewChoice}
          onNextReviewQuestion={handleNextReviewQuestion}
        />
      </section>
    );
  }

  if (isComplete) {
    return (
      <ListeningCompleteScreen
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
          <p className="mode-label">Listening Quiz</p>
          <h2>듣고 뜻 고르기</h2>
        </div>
        <button className="ghost-button" onClick={onBack}>
          홈으로
        </button>
      </div>

      <ListeningQuestionCard
        questionIndex={questionIndex}
        totalQuestions={totalQuestions}
        score={score}
        hasAnswered={hasAnswered}
        question={question}
        selectedAnswer={selectedAnswer}
        status={status}
        speech={speech}
        studentGrade={studentGrade}
        onReplay={() => announceQuestion(question)}
        onSelectChoice={handleSelectChoice}
        onNext={handleNext}
      />
    </section>
  );
}
