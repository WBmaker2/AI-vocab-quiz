import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { saveStudentProgress } from "../lib/firebase.js";
import { ProgressBar } from "./ProgressBar.jsx";
import { ResultSummary } from "./ResultSummary.jsx";
import { ScoreBoard } from "./ScoreBoard.jsx";
import { StudentProgressPanel } from "./StudentProgressPanel.jsx";
import { createListeningQuestions } from "../utils/quiz.js";
import { getListeningAnnouncementWord } from "../utils/listeningQuiz.js";
import {
  buildSessionReviewItems,
  registerSessionReviewMiss,
} from "../utils/sessionReview.js";

const SESSION_REVIEW_LIMIT = 3;

function getFeedbackMessage(question, selectedAnswer, status) {
  if (status === "correct") {
    return `정답입니다. "${question.word}"의 뜻은 "${question.meaning}"입니다.`;
  }

  if (status === "incorrect") {
    return `"${selectedAnswer}"는 오답입니다. 정답은 "${question.meaning}"입니다.`;
  }

  return "스피커 버튼을 누르거나 자동 재생을 듣고 알맞은 뜻을 고르세요.";
}

export function ListeningQuiz({
  items,
  remoteConfigured,
  progressionContext,
  studentNameDraft,
  onStudentNameDraftChange,
  speech,
  celebration,
  onBack,
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
  const [progressionLoading, setProgressionLoading] = useState(false);
  const [progressionStatus, setProgressionStatus] = useState("");
  const [progressionError, setProgressionError] = useState("");
  const [progressionComparison, setProgressionComparison] = useState(null);
  const [newlyEarnedBadges, setNewlyEarnedBadges] = useState([]);
  const [progressionStudentName, setProgressionStudentName] = useState("");
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
    setProgressionLoading(false);
    setProgressionStatus("");
    setProgressionError("");
    setProgressionComparison(null);
    setNewlyEarnedBadges([]);
    setProgressionStudentName("");
    setReviewEntries([]);
    setReviewPhase("idle");
    setReviewQuestions([]);
    setReviewIndex(0);
    setReviewScore(0);
    setReviewSelectedAnswer("");
    setReviewStatus("idle");
    setReviewSummary(null);
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
  const reviewCard = reviewSummary ? (
    <article className="session-review-summary-card">
      <p className="mode-label">Session Review</p>
      <h4>오답 복습을 마쳤어요</h4>
      <p className="result-copy">
        틀린 문제 {reviewSummary.total}개 중 {reviewSummary.correctedCount}개를 바로 고쳤어요.
      </p>
    </article>
  ) : availableReviewItems.length > 0 ? (
    <article className="session-review-card">
      <p className="mode-label">Session Review</p>
      <h4>방금 틀린 문제만 다시 연습할까요?</h4>
      <p className="result-copy">
        {availableReviewItems.length}문제를 바로 다시 풀 수 있어요.
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

  const announceQuestion = useEffectEvent((targetQuestion) => {
    const announcementWord = getListeningAnnouncementWord(targetQuestion, question);

    if (!announcementWord) {
      return;
    }

    speech.speak(announcementWord, {
      lang: "en-US",
      rate: 0.9,
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
    setProgressionLoading(false);
    setProgressionStatus("");
    setProgressionError("");
    setProgressionComparison(null);
    setNewlyEarnedBadges([]);
    setProgressionStudentName("");
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
        activityType: "listening",
        result: {
          score,
          correctCount: score,
        },
      });

      onStudentNameDraftChange?.(cleanStudentName);
      setProgressionStudentName(cleanStudentName);
      setProgressionComparison(saved.comparison);
      setNewlyEarnedBadges(saved.newlyEarnedBadges ?? []);
      setProgressionStatus(
        `${cleanStudentName} 학생의 듣기 성장 기록을 저장했습니다.`,
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
          title="듣기 성장 기록"
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
            <p className="mode-label">Listening Quiz</p>
            <h2>듣기 퀴즈</h2>
          </div>
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>

        <article className="empty-card">
          <h3>먼저 단어 세트를 불러오세요</h3>
          <p>
            듣기 퀴즈를 시작하려면 홈 화면에서 학년과 단원을 선택한 뒤 학생용
            단어 세트를 먼저 불러와야 합니다.
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
            <p className="mode-label">Listening Review</p>
            <h2>듣기 오답 복습 완료</h2>
          </div>
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>

        <ResultSummary
          title="듣기 오답 복습 완료"
          score={reviewSummary?.correctedCount ?? 0}
          total={reviewSummary?.total ?? 0}
          summaryCopy={`틀린 문제 ${reviewSummary?.total ?? 0}개 중 ${reviewSummary?.correctedCount ?? 0}개를 바로 고쳤어요.`}
          extraContent={
            <article className="session-review-summary-card">
              <p className="mode-label">Session Review</p>
              <h4>헷갈렸던 뜻을 다시 확인했어요</h4>
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
            <p className="mode-label">Listening Review</p>
            <h2>방금 틀린 문제 다시 풀기</h2>
          </div>
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>

        <div className="quiz-grid">
          <div className="quiz-main">
            <ScoreBoard
              questionIndex={reviewIndex}
              totalQuestions={reviewQuestions.length}
              score={reviewScore}
            />
            <ProgressBar
              value={reviewIndex + (hasReviewAnswered ? 1 : 0)}
              max={reviewQuestions.length}
            />

            <article className="question-card">
              <div className="question-head">
                <div>
                  <p className="mode-label">Review {reviewIndex + 1}</p>
                  <h3>헷갈렸던 뜻을 다시 들어보고 골라보세요</h3>
                </div>
                <button
                  className="secondary-button"
                  onClick={() => announceQuestion(reviewQuestion)}
                  disabled={!speech.supported}
                >
                  {speech.speaking ? "읽는 중..." : "다시 듣기"}
                </button>
              </div>

              <p className="question-copy">
                방금 틀린 문제만 다시 모았습니다. 이번에는 뜻을 천천히 골라보세요.
              </p>

              <div className="choices-grid">
                {reviewQuestion?.choices.map((choice) => {
                  const isSelected = reviewSelectedAnswer === choice;
                  const isCorrect = choice === reviewQuestion.meaning;
                  const choiceClassName = [
                    "choice-button",
                    isSelected ? "choice-selected" : "",
                    hasReviewAnswered && isCorrect ? "choice-correct" : "",
                    hasReviewAnswered && isSelected && !isCorrect
                      ? "choice-incorrect"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <button
                      key={`${reviewQuestion.id}-${choice}`}
                      className={choiceClassName}
                      onClick={() => handleSelectReviewChoice(choice)}
                      disabled={hasReviewAnswered}
                    >
                      {choice}
                    </button>
                  );
                })}
              </div>

              <div className="feedback-card" aria-live="polite">
                <p>{getFeedbackMessage(reviewQuestion, reviewSelectedAnswer, reviewStatus)}</p>
                {hasReviewAnswered ? (
                  <div className="feedback-meta">
                    <span>정답 단어: {reviewQuestion.word}</span>
                    {reviewQuestion.exampleSentence ? (
                      <span>예문: {reviewQuestion.exampleSentence}</span>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="toolbar-row">
                <button
                  className="primary-button"
                  onClick={handleNextReviewQuestion}
                  disabled={!hasReviewAnswered}
                >
                  {reviewIndex === reviewQuestions.length - 1
                    ? "복습 결과 보기"
                    : "다음 복습 문제"}
                </button>
              </div>
            </article>
          </div>

          <aside className="quiz-side">
            <article className="session-review-card">
              <p className="mode-label">Review Progress</p>
              <h4>오답 복습 진행 중</h4>
              <div className="session-review-progress">
                <span>복습 점수</span>
                <strong>{reviewScore} / {reviewQuestions.length}</strong>
              </div>
              <div className="session-review-progress">
                <span>남은 복습 문제</span>
                <strong>{Math.max(reviewQuestions.length - reviewIndex - 1, 0)}개</strong>
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
            <p className="mode-label">Listening Quiz</p>
            <h2>듣기 퀴즈 완료</h2>
          </div>
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>

        <ResultSummary
          title="듣고 뜻 고르기 완료"
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
          <p className="mode-label">Listening Quiz</p>
          <h2>듣고 뜻 고르기</h2>
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
                className="secondary-button"
                onClick={() => announceQuestion(question)}
                disabled={!speech.supported}
              >
                {speech.speaking ? "읽는 중..." : "다시 듣기"}
              </button>
            </div>

            <p className="question-copy">
              영어 단어를 듣고 가장 알맞은 뜻을 선택하세요.
            </p>

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
                    onClick={() => handleSelectChoice(choice)}
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
                className="primary-button"
                onClick={handleNext}
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
    </section>
  );
}
