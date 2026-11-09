import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { createListeningQuestions } from "../utils/quiz.js";
import { usePronunciation } from "../hooks/usePronunciation.js";
import { SoundGateCard } from "./SoundGateCard.jsx";
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
  const [soundUnlocked, setSoundUnlocked] = useState(false);
  const [gateError, setGateError] = useState("");
  const pronunciation = usePronunciation(speech);

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
    setSoundUnlocked(false);
    setGateError("");
  }, [items, resetProgression]);

  async function handleSoundGateStart() {
    setGateError("");

    try {
      await pronunciation.unlock();
    } catch {
      // 잠금 해제 실패해도 예열은 시도한다.
    }

    const words = questions.map((item) => item?.word).filter(Boolean);

    // 예열은 백그라운드로 돌리고 게이트는 즉시 통과시켜 1번 재생 지연을 막는다.
    void pronunciation.preloadWords(words).catch(() => {});

    setSoundUnlocked(true);
    announcedQuestionIdRef.current = "";
  }

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

    // 원어민 MP3 우선, 실패 시 TTS 폴백. 성공 여부와 무관하게 1회만 표시해
    // 무한 반복을 막고, 실패 시에는 다시 듣기 버튼으로 복구한다.
    void pronunciation.playWord(announcementWord, { rate: speech.rate });
  });

  function handleReplayQuestion(targetQuestion) {
    const announcementWord = getListeningAnnouncementWord(
      targetQuestion,
      isReviewPlaying ? reviewQuestion : question,
    );

    if (!announcementWord) {
      return;
    }

    void pronunciation.playWord(announcementWord, { rate: speech.rate });
  }

  useEffect(() => {
    if (!soundUnlocked) {
      return;
    }

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
  }, [isComplete, isReviewComplete, isReviewPlaying, question, reviewQuestion, soundUnlocked]);

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

  if (!soundUnlocked) {
    return (
      <SoundGateCard
        title="듣기 게임 소리 준비"
        itemCount={totalQuestions}
        preparing={pronunciation.preparing}
        error={gateError}
        onStart={handleSoundGateStart}
        onBack={onBack}
      />
    );
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
          pronunciation={pronunciation}
          studentGrade={studentGrade}
          onReplay={() => handleReplayQuestion(reviewQuestion)}
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
        pronunciation={pronunciation}
        studentGrade={studentGrade}
        onReplay={() => handleReplayQuestion(question)}
        onSelectChoice={handleSelectChoice}
        onNext={handleNext}
      />
    </section>
  );
}
