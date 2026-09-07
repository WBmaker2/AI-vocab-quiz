import { useEffect, useMemo, useState } from "react";
import { saveStudentProgress } from "../lib/firebase.js";
import { ProgressBar } from "./ProgressBar.jsx";
import { ResultSummary } from "./ResultSummary.jsx";
import { ScoreBoard } from "./ScoreBoard.jsx";
import { StudentProgressPanel } from "./StudentProgressPanel.jsx";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition.js";
import { createSpeakingSequence } from "../utils/quiz.js";
import {
  buildSessionReviewItems,
  registerSessionReviewMiss,
} from "../utils/sessionReview.js";
import { isSpeakingAnswerAccepted } from "../utils/speakingAcceptance.js";
import {
  canAdvanceSpeakingQuestion,
  isSpeakingConfigurationError,
  shouldCountSpeechRecognitionErrorAsAttempt,
} from "../utils/speakingAttempts.js";

const SESSION_REVIEW_LIMIT = 3;

function getGuidance(error) {
  if (error === "microphone-permission-denied") {
    return {
      title: "마이크 권한이 필요합니다",
      body: "브라우저 주소창의 사이트 권한에서 마이크를 허용한 뒤 다시 시도하세요.",
    };
  }

  if (error === "microphone-device-missing") {
    return {
      title: "마이크를 찾을 수 없습니다",
      body: "기기에 연결된 입력 마이크가 있는지 확인하고 다른 앱이 마이크를 사용 중인지 점검하세요.",
    };
  }

  if (error === "microphone-device-busy") {
    return {
      title: "마이크가 다른 앱에서 사용 중입니다",
      body: "다른 앱의 녹음이나 화상회의를 종료한 뒤 다시 시도하세요.",
    };
  }

  if (error === "speech-recognition-safari-limited") {
    return {
      title: "Safari 말하기 인식이 제한되었습니다",
      body: "마이크 권한이 허용되어 있어도 Safari에서는 브라우저 음성 인식이 시작되지 않을 수 있습니다. 새로고침 후 다시 시도하거나 Chrome 또는 Edge에서 여는 것이 더 안정적입니다.",
    };
  }

  if (error === "speech-recognition-service-unavailable" || error === "speech-recognition-network-error") {
    return {
      title: "브라우저 음성 인식을 시작하지 못했습니다",
      body: "마이크 권한과 입력 장치는 정상일 수 있지만, 현재 브라우저의 STT 서비스가 시작되지 않았습니다. 새로고침 후 다시 시도하거나 Chrome 또는 Edge에서 확인하세요.",
    };
  }

  if (error === "microphone-access-failed" || error === "speech-recognition-start-failed") {
    return {
      title: "말하기 인식을 시작하지 못했습니다",
      body: "브라우저를 새로고침하고 다시 시도하거나 Chrome 또는 Edge에서 확인하세요.",
    };
  }

  return null;
}

function getStatusMessage({
  supported,
  listening,
  transcript,
  question,
  status,
}) {
  if (!supported) {
    return "이 브라우저에서는 말하기 평가를 지원하지 않습니다. Chrome 또는 Edge에서 다시 시도하세요.";
  }

  if (listening) {
    return "듣는 중입니다. 화면의 단어를 또박또박 말해보세요.";
  }

  if (status === "correct") {
    return `좋아요. "${question.word}" 단어가 맞게 인식되었습니다.`;
  }

  if (status === "incorrect" && transcript) {
    return `인식 결과는 "${transcript}"입니다. 단어를 다시 듣고 한 번 더 말해보세요.`;
  }

  if (status === "empty") {
    return "음성이 인식되지 않았습니다. 마이크 버튼을 눌러 다시 시도하세요.";
  }

  return "단어를 보고 마이크 버튼을 눌러 말해보세요.";
}

export function SpeakingQuiz({
  items,
  remoteConfigured,
  progressionContext,
  studentNameDraft,
  onStudentNameDraftChange,
  speech,
  celebration,
  onBack,
}) {
  const recognition = useSpeechRecognition({ lang: "en-US", maxAlternatives: 3 });
  const [questions, setQuestions] = useState(() =>
    createSpeakingSequence(items),
  );
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState("idle");
  const [attemptTranscript, setAttemptTranscript] = useState("");
  const [celebratedQuestionId, setCelebratedQuestionId] = useState("");
  const [completionCelebrated, setCompletionCelebrated] = useState(false);
  const [progressionLoading, setProgressionLoading] = useState(false);
  const [progressionStatus, setProgressionStatus] = useState("");
  const [progressionError, setProgressionError] = useState("");
  const [progressionComparison, setProgressionComparison] = useState(null);
  const [newlyEarnedBadges, setNewlyEarnedBadges] = useState([]);
  const [progressionStudentName, setProgressionStudentName] = useState("");
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

  useEffect(() => {
    setQuestions(createSpeakingSequence(items));
    setQuestionIndex(0);
    setScore(0);
    setStatus("idle");
    setAttemptTranscript("");
    setCelebratedQuestionId("");
    setCompletionCelebrated(false);
    setProgressionLoading(false);
    setProgressionStatus("");
    setProgressionError("");
    setProgressionComparison(null);
    setNewlyEarnedBadges([]);
    setProgressionStudentName("");
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
  }, [items]);

  useEffect(() => {
    const cleanDraft = String(studentNameDraft ?? "").trim().replace(/\s+/g, " ");
    const cleanSaved = String(progressionStudentName ?? "").trim().replace(/\s+/g, " ");

    if (cleanSaved && cleanDraft && cleanSaved === cleanDraft) {
      return;
    }

    if (!cleanDraft || (cleanSaved && cleanSaved !== cleanDraft)) {
      setProgressionStatus("");
      setProgressionError("");
      setProgressionComparison(null);
      setNewlyEarnedBadges([]);
      if (cleanSaved && cleanSaved !== cleanDraft) {
        setProgressionStudentName("");
      }
    }
  }, [progressionStudentName, studentNameDraft]);

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
  const guidance = getGuidance(recognition.error);
  const reviewGuidance = getGuidance(reviewBlockingError || recognition.error);
  const availableReviewItems = useMemo(
    () => buildSessionReviewItems(reviewEntries, SESSION_REVIEW_LIMIT),
    [reviewEntries],
  );
  const hasReviewAvailable = recognition.supported && availableReviewItems.length > 0;
  const reviewCard = reviewSummary ? (
    <article className="session-review-summary-card">
      <p className="mode-label">Session Review</p>
      <h4>오답 복습을 마쳤어요</h4>
      <p className="result-copy">
        틀린 문제 {reviewSummary.total}개 중 {reviewSummary.correctedCount}개를 바로 다시 말했어요.
      </p>
    </article>
  ) : hasReviewAvailable ? (
    <article className="session-review-card">
      <p className="mode-label">Session Review</p>
      <h4>헷갈렸던 말하기 단어를 다시 연습할까요?</h4>
      <p className="result-copy">
        방금 틀린 {availableReviewItems.length}문제를 바로 다시 말해볼 수 있어요.
      </p>
      <div className="toolbar-row">
        <button className="primary-button" onClick={handleStartReview}>
          오답 복습 시작
        </button>
        <button className="ghost-button" onClick={onBack}>
          이번에는 건너뛰기
        </button>
      </div>
    </article>
  ) : null;

  useEffect(() => {
    const activeQuestion = isReviewPlaying ? reviewQuestion : question;

    if (!activeQuestion || recognition.listening) {
      return;
    }

    if (!recognition.transcript) {
      return;
    }

    const transcript = recognition.transcript.trim();
    if (isReviewPlaying) {
      setReviewAttemptTranscript(transcript);

      if (isSpeakingAnswerAccepted(recognition.candidates, activeQuestion.word)) {
        resetReviewQuestionFailureState();
        setReviewStatus((current) => {
          if (current !== "correct") {
            setReviewScore((scoreValue) => scoreValue + 1);
          }
          return "correct";
        });
        return;
      }

      setReviewBlockingError("");
      setReviewFailedAttempts((current) => current + 1);
      setReviewStatus("incorrect");
      return;
    }

    setAttemptTranscript(transcript);

    if (isSpeakingAnswerAccepted(recognition.candidates, activeQuestion.word)) {
      resetQuestionFailureState();
      setStatus((current) => {
        if (current !== "correct") {
          setScore((scoreValue) => scoreValue + 1);
        }
        return "correct";
      });
      return;
    }

    setBlockingError("");
    setFailedAttempts((current) => current + 1);
    setStatus("incorrect");
  }, [
    isReviewPlaying,
    question?.id,
    question?.word,
    recognition.listening,
    recognition.candidates,
    recognition.transcript,
    reviewQuestion?.id,
    reviewQuestion?.word,
  ]);

  useEffect(() => {
    const activeQuestion = isReviewPlaying ? reviewQuestion : question;

    if (!activeQuestion || !recognition.error) {
      return;
    }

    if (shouldCountSpeechRecognitionErrorAsAttempt(recognition.error)) {
      if (isReviewPlaying) {
        setReviewBlockingError("");
        setReviewFailedAttempts((current) => current + 1);
        setReviewStatus("empty");
        return;
      }

      setBlockingError("");
      setFailedAttempts((current) => current + 1);
      setStatus("empty");
      return;
    }

    if (isSpeakingConfigurationError(recognition.error)) {
      if (isReviewPlaying) {
        setReviewBlockingError(recognition.error);
        setReviewStatus("idle");
        return;
      }

      setBlockingError(recognition.error);
      setStatus("idle");
      return;
    }

    if (isReviewPlaying) {
      setReviewBlockingError("");
      setReviewStatus("incorrect");
      return;
    }

    setBlockingError("");
    setStatus("incorrect");
  }, [isReviewPlaying, question?.id, recognition.error, reviewQuestion?.id]);

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
      rate: 0.9,
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
    setProgressionLoading(false);
    setProgressionStatus("");
    setProgressionError("");
    setProgressionComparison(null);
    setNewlyEarnedBadges([]);
    setProgressionStudentName("");
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

  async function handleSaveProgress() {
    const cleanStudentName = String(studentNameDraft ?? "")
      .trim()
      .replace(/\s+/g, " ");
    const schoolId = String(progressionContext?.schoolId ?? "").trim();
    const schoolName = String(progressionContext?.schoolName ?? "").trim();
    const grade = String(progressionContext?.grade ?? "").trim();

    if (!remoteConfigured) {
      setProgressionError("Firebase 연결이 없어 개인 기록을 저장할 수 없습니다.");
      return;
    }

    if (!schoolId || !schoolName || !grade) {
      setProgressionError("학교와 학년을 확인한 뒤 다시 시도해 주세요.");
      return;
    }

    if (!cleanStudentName) {
      setProgressionError("학생 이름을 입력해 주세요.");
      return;
    }

    setProgressionLoading(true);
    setProgressionError("");
    setProgressionStatus("");

    try {
      const saved = await saveStudentProgress({
        schoolId,
        schoolName,
        grade,
        studentName: cleanStudentName,
        activityType: "speaking",
        result: {
          score,
          correctCount: score,
          completed: true,
        },
      });

      onStudentNameDraftChange?.(cleanStudentName);
      setProgressionStudentName(cleanStudentName);
      setProgressionComparison(saved.comparison);
      setNewlyEarnedBadges(saved.newlyEarnedBadges ?? []);
      setProgressionStatus(
        `${cleanStudentName} 학생의 말하기 성장 기록을 저장했습니다.`,
      );
    } catch (error) {
      setProgressionError(error?.message || "개인 기록을 저장하지 못했습니다.");
    } finally {
      setProgressionLoading(false);
    }
  }

  const progressionDisabledReason = !remoteConfigured
    ? "Firebase 연결이 없어 이 기기에서는 개인 기록을 저장할 수 없습니다."
    : !progressionContext?.schoolId || !progressionContext?.schoolName || !progressionContext?.grade
      ? "학교와 학년을 먼저 선택하면 개인 최고 기록과 배지를 저장할 수 있어요."
      : !String(studentNameDraft ?? "").trim()
        ? "학생 이름을 입력하면 개인 최고 기록과 배지를 저장할 수 있어요."
        : "";
  const hasSavedProgress = Boolean(progressionStudentName);

  const progressionContent = (
    <>
      <section className="result-progression-block">
        <div className="result-progression-form">
          <label className="matching-save-field">
            <span>학생 이름</span>
            <input
              type="text"
              value={studentNameDraft}
              maxLength={20}
              placeholder="이름을 입력하세요"
              onChange={(event) => onStudentNameDraftChange?.(event.target.value)}
              disabled={progressionLoading || hasSavedProgress}
            />
          </label>
          <div className="matching-leaderboard-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => void handleSaveProgress()}
              disabled={
                progressionLoading ||
                hasSavedProgress ||
                !String(studentNameDraft ?? "").trim()
              }
            >
              {progressionLoading
                ? "저장 중..."
                : hasSavedProgress
                  ? "저장 완료"
                  : "개인 기록 저장"}
            </button>
          </div>
        </div>
        {progressionStatus ? (
          <p className="matching-leaderboard-status">{progressionStatus}</p>
        ) : null}
        {progressionError ? (
          <p className="matching-leaderboard-error">{progressionError}</p>
        ) : null}
        <StudentProgressPanel
          comparison={progressionComparison}
          newlyEarnedBadges={newlyEarnedBadges}
          disabledReason={!progressionComparison ? progressionDisabledReason : ""}
          loading={progressionLoading}
          title="말하기 성장 기록"
        />
      </section>
      {reviewCard}
    </>
  );

  if (items.length === 0) {
    return (
      <section className="workspace-panel">
        <div className="section-heading">
          <div>
            <p className="mode-label">Speaking Quiz</p>
            <h2>말하기 연습</h2>
          </div>
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>

        <article className="empty-card">
          <h3>먼저 단어 세트를 불러오세요</h3>
          <p>
            말하기 연습을 시작하려면 홈 화면에서 학년과 단원을 선택한 뒤
            학생용 단어 세트를 먼저 불러와야 합니다.
          </p>
          <div className="toolbar-row">
            <button className="ghost-button" onClick={onBack}>
              홈으로
            </button>
          </div>
        </article>
      </section>
    );
  }

  if (!recognition.supported) {
    return (
      <section className="workspace-panel">
        <div className="section-heading">
          <div>
            <p className="mode-label">Speaking Quiz</p>
            <h2>말하기 연습</h2>
          </div>
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>

        <article className="empty-card">
          <h3>브라우저 지원이 필요합니다</h3>
          <p>
            현재 브라우저에서는 말하기 평가를 사용할 수 없습니다. Chrome 또는
            Edge에서 다시 열면 마이크 기반 STT 평가가 동작합니다.
          </p>
          <div className="toolbar-row">
            <button className="ghost-button" onClick={onBack}>
              홈으로
            </button>
          </div>
        </article>
      </section>
    );
  }

  if (isReviewComplete) {
    return (
      <section className="workspace-panel">
        <div className="section-heading">
          <div>
            <p className="mode-label">Speaking Review</p>
            <h2>말하기 오답 복습 완료</h2>
          </div>
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>

        <ResultSummary
          title="말하기 오답 복습 완료"
          score={reviewSummary?.correctedCount ?? 0}
          total={reviewSummary?.total ?? 0}
          summaryCopy={`틀린 문제 ${reviewSummary?.total ?? 0}개 중 ${reviewSummary?.correctedCount ?? 0}개를 바로 다시 말했어요.`}
          extraContent={
            <article className="session-review-summary-card">
              <p className="mode-label">Session Review</p>
              <h4>헷갈렸던 발음을 바로 복습했어요</h4>
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
              <button className="primary-button" onClick={handleReturnToResult}>
                원래 결과 다시 보기
              </button>
              <button className="ghost-button" onClick={onBack}>
                홈으로
              </button>
            </div>
          }
          onRetry={handleReturnToResult}
          onBack={onBack}
        />
      </section>
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
                  onClick={handleReplayWord}
                  disabled={!speech.supported}
                >
                  {speech.speaking ? "읽는 중..." : "원어민 발음 듣기"}
                </button>
              </div>

              <div className="speaking-word-card">
                <p className="speaking-word">{reviewQuestion?.word ?? ""}</p>
                <p className="speaking-meaning">{reviewQuestion?.meaning ?? ""}</p>
              </div>

              <div className="toolbar-row">
                <button
                  className="primary-button"
                  onClick={handleStartListening}
                  disabled={recognition.listening || reviewStatus === "correct"}
                >
                  {recognition.listening ? "듣는 중..." : "마이크로 다시 말하기"}
                </button>
                <button
                  className="ghost-button"
                  onClick={handleResetReviewAttempt}
                  disabled={recognition.listening || reviewStatus === "correct"}
                >
                  다시 시도 준비
                </button>
              </div>

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
                  className="primary-button"
                  onClick={handleNextReviewQuestion}
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
      </section>
    );
  }

  if (isComplete) {
    return (
      <section className="workspace-panel">
        <div className="section-heading">
          <div>
            <p className="mode-label">Speaking Quiz</p>
            <h2>말하기 연습 완료</h2>
          </div>
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>

        <ResultSummary
          title="보고 말하기 완료"
          score={score}
          total={totalQuestions}
          extraContent={progressionContent}
          onRetry={handleRetry}
          onBack={onBack}
        />
      </section>
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
                onClick={handleReplayWord}
                disabled={!speech.supported}
              >
                {speech.speaking ? "읽는 중..." : "원어민 발음 듣기"}
              </button>
            </div>

            <div className="speaking-word-card">
              <p className="speaking-word">{question.word}</p>
              <p className="speaking-meaning">{question.meaning}</p>
            </div>

            <div className="toolbar-row">
              <button
                className="primary-button"
                onClick={handleStartListening}
                disabled={recognition.listening || isLockedAfterCorrect}
              >
                {recognition.listening ? "듣는 중..." : "마이크로 말하기"}
              </button>
              <button
                className="ghost-button"
                onClick={handleTryAgain}
                disabled={recognition.listening || isLockedAfterCorrect}
              >
                다시 시도 준비
              </button>
            </div>

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
                className="primary-button"
                onClick={handleNext}
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
    </section>
  );
}
