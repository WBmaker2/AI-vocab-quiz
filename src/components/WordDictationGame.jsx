import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ProgressBar } from "./ProgressBar.jsx";
import { ResultSummary } from "./ResultSummary.jsx";
import { ScoreBoard } from "./ScoreBoard.jsx";
import { SpeechRateToggle } from "./SpeechRateToggle.jsx";
import { WordImage } from "./WordImage.jsx";
import { createDictationSequence, gradeDictationAnswer } from "../utils/dictation.js";
import {
  buildSessionReviewItems,
  registerSessionReviewMiss,
} from "../utils/sessionReview.js";

const SESSION_REVIEW_LIMIT = 3;

export function WordDictationGame({
  items,
  speech,
  celebration,
  studentGrade,
  onBack,
}) {
  const [questions, setQuestions] = useState(() => createDictationSequence(items));
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("idle");
  const [celebratedQuestionId, setCelebratedQuestionId] = useState("");
  const [completionCelebrated, setCompletionCelebrated] = useState(false);
  const [reviewEntries, setReviewEntries] = useState([]);
  const [reviewPhase, setReviewPhase] = useState("idle");
  const [reviewItems, setReviewItems] = useState([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewScore, setReviewScore] = useState(0);
  const [reviewDraft, setReviewDraft] = useState("");
  const [reviewStatus, setReviewStatus] = useState("idle");
  const [reviewSummary, setReviewSummary] = useState(null);
  const announcedQuestionIdRef = useRef("");
  const { warmup } = speech ?? {};

  useEffect(() => {
    setQuestions(createDictationSequence(items));
    setQuestionIndex(0);
    setScore(0);
    setDraft("");
    setStatus("idle");
    setCelebratedQuestionId("");
    setCompletionCelebrated(false);
    setReviewEntries([]);
    setReviewPhase("idle");
    setReviewItems([]);
    setReviewIndex(0);
    setReviewScore(0);
    setReviewDraft("");
    setReviewStatus("idle");
    setReviewSummary(null);
    announcedQuestionIdRef.current = "";
  }, [items]);

  useEffect(() => {
    warmup?.();
  }, [warmup]);

  const totalQuestions = questions.length;
  const question = questions[questionIndex];
  const reviewQuestion = reviewItems[reviewIndex];
  const isReviewPlaying = reviewPhase === "playing";
  const isReviewComplete = reviewPhase === "complete";
  const isComplete = status === "complete";
  const hasAnswered = status === "correct" || status === "incorrect";
  const hasReviewAnswered = reviewStatus === "correct" || reviewStatus === "incorrect";

  const announceQuestion = useEffectEvent((targetQuestion) => {
    if (!targetQuestion?.word) {
      return;
    }

    speech.speak(targetQuestion.word, { lang: "en-US" });
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

  function handleSubmit(event) {
    event.preventDefault();

    if (!question || hasAnswered) {
      return;
    }

    if (gradeDictationAnswer(draft, question.word)) {
      setStatus("correct");
      setScore((current) => current + 1);
    } else {
      setStatus("incorrect");
    }
  }

  function handleNext() {
    if (status !== "correct" && question) {
      setReviewEntries((current) => registerSessionReviewMiss(current, question, "dictation"));
    }

    if (questionIndex === totalQuestions - 1) {
      setStatus("complete");
      return;
    }

    setQuestionIndex((current) => current + 1);
    setStatus("idle");
    setDraft("");
    setCelebratedQuestionId("");
  }

  function handleRetry() {
    setQuestions(createDictationSequence(items));
    setQuestionIndex(0);
    setScore(0);
    setDraft("");
    setStatus("idle");
    setCelebratedQuestionId("");
    setCompletionCelebrated(false);
    setReviewEntries([]);
    setReviewPhase("idle");
    setReviewItems([]);
    setReviewIndex(0);
    setReviewScore(0);
    setReviewDraft("");
    setReviewStatus("idle");
    setReviewSummary(null);
    announcedQuestionIdRef.current = "";
  }

  function handleReviewSubmit(event) {
    event.preventDefault();

    if (!reviewQuestion || hasReviewAnswered) {
      return;
    }

    if (gradeDictationAnswer(reviewDraft, reviewQuestion.word)) {
      setReviewStatus("correct");
      setReviewScore((current) => current + 1);
    } else {
      setReviewStatus("incorrect");
    }
  }

  function handleNextReviewQuestion() {
    if (reviewIndex === reviewItems.length - 1) {
      setReviewSummary({ total: reviewItems.length, correctedCount: reviewScore });
      setReviewPhase("complete");
      return;
    }

    setReviewIndex((current) => current + 1);
    setReviewStatus("idle");
    setReviewDraft("");
  }

  function handleStartReview() {
    const available = buildSessionReviewItems(reviewEntries, SESSION_REVIEW_LIMIT);

    if (available.length === 0) {
      return;
    }

    setReviewItems(createDictationSequence(available));
    setReviewIndex(0);
    setReviewScore(0);
    setReviewStatus("idle");
    setReviewDraft("");
    setReviewSummary(null);
    setReviewPhase("playing");
    announcedQuestionIdRef.current = "";
  }

  function handleReturnToResult() {
    setReviewPhase("idle");
  }

  const availableReviewItems = buildSessionReviewItems(reviewEntries, SESSION_REVIEW_LIMIT);

  function renderQuestionCard({
    targetQuestion,
    indexLabel,
    heading,
    value,
    answered,
    currentStatus,
    onReplay,
    onChange,
    onSubmit,
    replayLabel,
  }) {
    return (
      <article className="question-card">
        <div className="question-head">
          <div>
            <p className="mode-label">{indexLabel}</p>
            <h3>{heading}</h3>
          </div>
          <button
            className="secondary-button gi-pulse"
            onClick={onReplay}
            disabled={!speech.supported}
          >
            {speech.speaking ? "읽는 중..." : replayLabel}
          </button>
        </div>

        <SpeechRateToggle speech={speech} studentGrade={studentGrade} />

        <p className="question-copy">뜻: {targetQuestion?.meaning ?? ""}</p>
        <WordImage item={targetQuestion} />

        <form className="word-typing-input-form" autoComplete="off" onSubmit={onSubmit}>
          <input
            className="word-typing-textbox"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="들은 영어 단어를 입력하세요"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            disabled={answered}
          />
          <button className="primary-button gi-pulse" type="submit" disabled={answered}>
            입력 완료
          </button>
        </form>

        <div className="feedback-card" aria-live="polite">
          {currentStatus === "correct" ? (
            <p>정답입니다. 잘 들었습니다.</p>
          ) : currentStatus === "incorrect" ? (
            <p>다시 들어보고 천천히 써 보세요. 정답은 아직 보여주지 않습니다.</p>
          ) : (
            <p>소리를 듣고 영어 단어를 입력하세요.</p>
          )}
        </div>
      </article>
    );
  }

  if (items.length === 0) {
    return (
      <section className="workspace-panel">
        <div className="section-heading">
          <div>
            <p className="mode-label">Dictation Quiz</p>
            <h2>받아쓰기</h2>
          </div>
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>
        <article className="empty-card">
          <h3>먼저 단어 세트를 불러오세요</h3>
          <p>홈 화면에서 학년과 단원을 선택한 뒤 학생용 단어 세트를 먼저 불러와야 합니다.</p>
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
            <p className="mode-label">Dictation Review</p>
            <h2>받아쓰기 오답 복습 완료</h2>
          </div>
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>
        <ResultSummary
          title="받아쓰기 오답 복습 완료"
          score={reviewSummary?.correctedCount ?? 0}
          total={reviewSummary?.total ?? 0}
          summaryCopy={`틀린 문제 ${reviewSummary?.total ?? 0}개 중 ${reviewSummary?.correctedCount ?? 0}개를 바로 고쳤어요.`}
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
            <p className="mode-label">Dictation Review</p>
            <h2>방금 틀린 문제 다시 쓰기</h2>
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
            {renderQuestionCard({
              targetQuestion: reviewQuestion,
              indexLabel: `Review ${reviewIndex + 1}`,
              heading: "헷갈렸던 단어를 다시 들어보고 쓰세요",
              value: reviewDraft,
              answered: hasReviewAnswered,
              currentStatus: reviewStatus,
              onReplay: () => announceQuestion(reviewQuestion),
              onChange: setReviewDraft,
              onSubmit: handleReviewSubmit,
              replayLabel: "다시 듣기",
            })}
            <div className="toolbar-row">
              <button
                className={`primary-button${hasReviewAnswered ? " gi-pulse" : ""}`}
                onClick={handleNextReviewQuestion}
                disabled={!hasReviewAnswered}
              >
                {reviewIndex === reviewItems.length - 1 ? "복습 결과 보기" : "다음 복습 문제"}
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (isComplete) {
    const reviewCard = availableReviewItems.length > 0 ? (
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

    return (
      <section className="workspace-panel">
        <div className="section-heading">
          <div>
            <p className="mode-label">Dictation Quiz</p>
            <h2>받아쓰기 완료</h2>
          </div>
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>
        <ResultSummary
          title="받아쓰기 완료"
          score={score}
          total={totalQuestions}
          extraContent={reviewCard}
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
          <p className="mode-label">Dictation Quiz</p>
          <h2>듣고 쓰기</h2>
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
          {renderQuestionCard({
            targetQuestion: question,
            indexLabel: `Question ${questionIndex + 1}`,
            heading: "소리를 듣고 영어 단어를 써 보세요",
            value: draft,
            answered: hasAnswered,
            currentStatus: status,
            onReplay: () => announceQuestion(question),
            onChange: setDraft,
            onSubmit: handleSubmit,
            replayLabel: "다시 듣기",
          })}
          <div className="toolbar-row">
            <button
              className={`primary-button${hasAnswered ? " gi-pulse" : ""}`}
              onClick={handleNext}
              disabled={!hasAnswered}
            >
              {questionIndex === totalQuestions - 1 ? "결과 보기" : "다음 문제"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
