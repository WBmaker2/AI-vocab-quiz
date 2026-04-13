import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  saveStudentProgress,
  saveTypingLeaderboardScore,
} from "../lib/firebase.js";
import { GameLeaderboardPanel } from "./GameLeaderboardPanel.jsx";
import { ProgressBar } from "./ProgressBar.jsx";
import { ResultSummary } from "./ResultSummary.jsx";
import { StudentProgressPanel } from "./StudentProgressPanel.jsx";
import {
  buildSessionReviewItems,
  registerSessionReviewMiss,
} from "../utils/sessionReview.js";
import {
  calculateTypingAverageSeconds,
  calculateTypingScore,
  createTypingHint,
  isTypingAnswerCorrect,
  normalizeTypingItems,
} from "../utils/wordTyping.js";
import {
  createCombinedStudentResultStatus,
  saveCombinedStudentResult,
} from "../utils/studentResultSave.js";

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

function formatAverageSeconds(value) {
  return `${Number(value ?? 0).toFixed(1)}초`;
}

function formatTypingAccuracy(value) {
  const numericValue = Number(value ?? 0);

  return Number.isInteger(numericValue)
    ? `${numericValue}%`
    : `${numericValue.toFixed(1)}%`;
}

function TypingStartCard({ canStart, ttsSupported, itemCount, onStart, onBack }) {
  return (
    <section className="workspace-panel word-typing-shell">
      <div className="section-heading">
        <div>
          <p className="mode-label">Word Typing</p>
          <h2>영어 단어 타자 게임</h2>
        </div>
        <button className="ghost-button" onClick={onBack}>
          홈으로
        </button>
      </div>

      <article className="form-card word-typing-start-card">
        <p className="mode-label">Meaning + TTS Typing Mode</p>
        <h3>뜻을 보고 발음을 들은 뒤 영어 단어를 직접 입력해 보세요</h3>
        <p className="question-copy">
          빠른 타자보다 정확하게 써 보는 것이 더 중요합니다. 문제마다 한국어 뜻을 보고,
          영어 발음을 들은 뒤 단어를 직접 입력하면 됩니다.
        </p>

        <div className="word-typing-rule-grid">
          <article className="word-typing-rule-card">
            <span>현재 단어 수</span>
            <strong>{itemCount}개</strong>
          </article>
          <article className="word-typing-rule-card">
            <span>입력 기회</span>
            <strong>문제당 3번</strong>
          </article>
          <article className="word-typing-rule-card">
            <span>발음 지원</span>
            <strong>TTS 1회 자동 재생</strong>
          </article>
          <article className="word-typing-rule-card">
            <span>보상</span>
            <strong>콤보 + 축하음</strong>
          </article>
        </div>

        {!ttsSupported ? (
          <p className="inline-hint warning-hint">
            이 브라우저는 TTS를 지원하지 않아 영어 발음을 들려줄 수 없습니다.
          </p>
        ) : null}
        {!canStart ? (
          <p className="inline-hint warning-hint">
            타자 게임을 시작하려면 먼저 공개 단어 세트를 불러오세요.
          </p>
        ) : null}

        <div className="toolbar-row">
          <button
            className="primary-button"
            onClick={onStart}
            disabled={!canStart || !ttsSupported}
          >
            게임 시작
          </button>
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>
      </article>
    </section>
  );
}

function TypingResultCard({
  score,
  correctCount,
  failedCount,
  questionCount,
  elapsedSeconds,
  hintUsedCount,
  averageSeconds,
  bestCombo,
  accuracy,
  leaderboardContext,
  progressionContext,
  remoteConfigured,
  studentNameDraft,
  onStudentNameDraftChange,
  hasReviewAvailable,
  reviewCount,
  reviewSummary,
  onStartReview,
  onRetry,
  onBack,
}) {
  const [progressionLoading, setProgressionLoading] = useState(false);
  const [progressionStatus, setProgressionStatus] = useState("");
  const [progressionError, setProgressionError] = useState("");
  const [progressionComparison, setProgressionComparison] = useState(null);
  const [newlyEarnedBadges, setNewlyEarnedBadges] = useState([]);
  const [progressionStudentName, setProgressionStudentName] = useState("");
  const [leaderboardRefreshVersion, setLeaderboardRefreshVersion] = useState(0);

  const progressionSchoolId = String(progressionContext?.schoolId ?? "").trim();
  const progressionSchoolName = String(progressionContext?.schoolName ?? "").trim();
  const progressionGrade = String(progressionContext?.grade ?? "").trim();
  const leaderboardSchoolId = String(leaderboardContext?.schoolId ?? "").trim();
  const leaderboardSchoolName = String(leaderboardContext?.schoolName ?? "").trim();
  const leaderboardGrade = String(leaderboardContext?.grade ?? "").trim();
  const canSaveRecords =
    remoteConfigured &&
    progressionSchoolId &&
    progressionSchoolName &&
    progressionGrade &&
    leaderboardSchoolId &&
    leaderboardSchoolName &&
    leaderboardGrade;

  useEffect(() => {
    setProgressionLoading(false);
    setProgressionStatus("");
    setProgressionError("");
    setProgressionComparison(null);
    setNewlyEarnedBadges([]);
    setProgressionStudentName("");
  }, [
    score,
    correctCount,
    failedCount,
    questionCount,
    elapsedSeconds,
    hintUsedCount,
    bestCombo,
    accuracy,
    progressionSchoolId,
    progressionSchoolName,
    progressionGrade,
    remoteConfigured,
  ]);

  useEffect(() => {
    const cleanDraft = String(studentNameDraft ?? "").trim().replace(/\s+/g, " ");
    const cleanSaved = String(progressionStudentName ?? "")
      .trim()
      .replace(/\s+/g, " ");

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

  async function handleSaveRecords() {
    if (!canSaveRecords) {
      setProgressionError("학교와 학년 정보를 확인한 뒤 다시 시도해 주세요.");
      return;
    }

    setProgressionLoading(true);
    setProgressionError("");
    setProgressionStatus("");

    try {
      const saved = await saveCombinedStudentResult({
        studentName: studentNameDraft,
        saveLeaderboard: (cleanStudentName) =>
          saveTypingLeaderboardScore({
            schoolId: leaderboardSchoolId,
            schoolName: leaderboardSchoolName,
            grade: leaderboardGrade,
            studentName: cleanStudentName,
            score,
            elapsedSeconds,
            questionCount,
            correctCount,
            accuracy,
            hintUsedCount,
            bestCombo,
          }),
        saveProgress: (cleanStudentName) =>
          saveStudentProgress({
            schoolId: progressionSchoolId,
            schoolName: progressionSchoolName,
            grade: progressionGrade,
            studentName: cleanStudentName,
            activityType: "typing",
            result: {
              score,
              elapsedSeconds,
              correctCount,
              questionCount,
              accuracy,
              hintUsedCount,
              bestCombo,
            },
          }),
      });

      onStudentNameDraftChange?.(saved.studentName);
      setLeaderboardRefreshVersion((current) => current + 1);

      if (saved.progress) {
        setProgressionStudentName(saved.studentName);
        setProgressionComparison(saved.progress.comparison);
        setNewlyEarnedBadges(saved.progress.newlyEarnedBadges ?? []);
      }

      setProgressionStatus(
        createCombinedStudentResultStatus({
          activityLabel: "영어 타자",
          studentName: saved.studentName,
          leaderboard: saved.leaderboard,
          progressSaved: Boolean(saved.progress),
        }),
      );
    } catch (error) {
      setProgressionError(error?.message || "기록을 저장하지 못했습니다.");
    } finally {
      setProgressionLoading(false);
    }
  }

  const progressionDisabledReason = !remoteConfigured
    ? "Firebase 연결이 없어 이 기기에서는 기록을 저장할 수 없습니다."
    : !canSaveRecords
      ? "학교와 학년을 먼저 선택하면 개인 최고 기록과 리더보드를 함께 저장할 수 있어요."
      : !String(studentNameDraft ?? "").trim()
        ? "학생 이름을 입력하면 개인 최고 기록과 리더보드를 함께 저장할 수 있어요."
        : "";
  const hasSavedProgress = Boolean(progressionStudentName);

  return (
    <section className="workspace-panel word-typing-shell">
      <div className="section-heading">
        <div>
          <p className="mode-label">Word Typing Result</p>
          <h2>영어 단어 타자 게임 완료</h2>
        </div>
        <button className="ghost-button" onClick={onBack}>
          홈으로
        </button>
      </div>

      <article className="result-card word-typing-result-card">
        <p className="mode-label">Typing Summary</p>
        <h3>단원 핵심 단어를 직접 써 보며 연습을 마쳤어요</h3>
        <p className="result-score">{score}점</p>
        <p className="result-copy">
          뜻과 발음을 단서로 단어를 떠올려 직접 입력한 결과입니다.
        </p>

        <div className="word-typing-summary-grid">
          <article className="word-typing-summary-card">
            <span>정답</span>
            <strong>{correctCount}개</strong>
          </article>
          <article className="word-typing-summary-card">
            <span>문항 수</span>
            <strong>{questionCount}개</strong>
          </article>
          <article className="word-typing-summary-card">
            <span>정확도</span>
            <strong>{formatTypingAccuracy(accuracy)}</strong>
          </article>
          <article className="word-typing-summary-card">
            <span>걸린 시간</span>
            <strong>{formatAverageSeconds(elapsedSeconds)}</strong>
          </article>
          <article className="word-typing-summary-card">
            <span>힌트 사용</span>
            <strong>{hintUsedCount}회</strong>
          </article>
          <article className="word-typing-summary-card">
            <span>최고 콤보</span>
            <strong>{bestCombo}콤보</strong>
          </article>
        </div>

        <p className="result-copy">
          {failedCount > 0
            ? `틀린 문제는 ${failedCount}개였습니다. 정확도와 콤보를 함께 올리는 방향으로 연습해 보세요.`
            : "모든 문제를 한 번 이상 맞혔습니다. 다음에는 더 빠르게 써 보는 연습을 해 보세요."}
        </p>

        <section className="result-progression-block">
          <div className="matching-leaderboard-head">
            <div>
              <p className="mode-label">Student Progress</p>
              <h4>개인 최고 기록과 리더보드 점수를 함께 저장할까요?</h4>
            </div>
          </div>

          <div className="matching-save-form">
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
                onClick={() => void handleSaveRecords()}
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
                    : "기록 저장"}
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
            title="영어 타자 성장 기록"
          />
        </section>

        {reviewSummary ? (
          <article className="session-review-summary-card">
            <p className="mode-label">Session Review</p>
            <h4>오답 복습을 마쳤어요</h4>
            <p className="result-copy">
              틀린 단어 {reviewSummary.total}개 중 {reviewSummary.correctedCount}개를 바로 다시 썼어요.
            </p>
          </article>
        ) : hasReviewAvailable ? (
          <article className="session-review-card">
            <p className="mode-label">Session Review</p>
            <h4>방금 틀린 단어만 다시 써볼까요?</h4>
            <p className="result-copy">
              {reviewCount}개 단어를 바로 다시 쓰며 복습할 수 있어요.
            </p>
            <div className="toolbar-row">
              <button className="primary-button" onClick={onStartReview}>
                오답 복습 시작
              </button>
              <button className="ghost-button" onClick={onBack}>
                이번에는 건너뛰기
              </button>
            </div>
          </article>
        ) : null}

        <GameLeaderboardPanel
          activityType="typing"
          finalScore={score}
          elapsedSeconds={elapsedSeconds}
          leaderboardContext={leaderboardContext}
          remoteConfigured={remoteConfigured}
          studentNameDraft={studentNameDraft}
          onStudentNameDraftChange={onStudentNameDraftChange}
          allowSaving={false}
          refreshVersion={leaderboardRefreshVersion}
          metrics={{
            correctCount,
            questionCount,
            accuracy,
            hintUsedCount,
            bestCombo,
          }}
        />

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
              <strong>{questionCount}개</strong>
            </div>
            <div className="progression-metric">
              <span>평균 입력 시간</span>
              <strong>{formatAverageSeconds(averageSeconds)}</strong>
            </div>
          </div>
        </article>

        <div className="toolbar-row">
          <button className="primary-button" onClick={onRetry}>
            다시 하기
          </button>
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>
      </article>
    </section>
  );
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
              <strong>{Math.max(ATTEMPT_LIMIT - attemptCount, 0)}번</strong>
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

            <form className="word-typing-input-form" onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                className="word-typing-textbox"
                value={currentInput}
                onChange={(event) => setCurrentInput(event.target.value)}
                placeholder="영어 단어를 입력하세요"
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
