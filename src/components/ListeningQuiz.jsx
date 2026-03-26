import { useEffect, useEffectEvent, useRef, useState } from "react";
import { saveStudentProgress } from "../lib/firebase.js";
import { ProgressBar } from "./ProgressBar.jsx";
import { ResultSummary } from "./ResultSummary.jsx";
import { ScoreBoard } from "./ScoreBoard.jsx";
import { StudentProgressPanel } from "./StudentProgressPanel.jsx";
import { createListeningQuestions } from "../utils/quiz.js";

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
  const isComplete = status === "complete";
  const hasAnswered = status === "correct" || status === "incorrect";

  const announceQuestion = useEffectEvent(() => {
    if (!question) {
      return;
    }

    speech.speak(question.word, {
      lang: "en-US",
      rate: 0.9,
    });
  });

  useEffect(() => {
    if (!question || isComplete) {
      return;
    }

    if (announcedQuestionIdRef.current === question.id) {
      return;
    }

    announcedQuestionIdRef.current = question.id;
    announceQuestion();
  }, [announceQuestion, isComplete, question?.id]);

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
    }
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
                onClick={announceQuestion}
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
