import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { FishingStartCard } from "./fishing/FishingStartCard.jsx";
import { FishingResultCard } from "./fishing/FishingResultCard.jsx";
import {
  calculateFishingScore,
  createFishingRound,
  FISHING_MAX_ROUNDS,
  FISHING_ROUND_DURATION_MS,
  FISHING_ROUND_DURATION_SECONDS,
  formatAverageReactionTime,
  normalizeFishingItems,
} from "../utils/wordFishing.js";

const ROUND_DURATION_MS = FISHING_ROUND_DURATION_MS;
const TRANSITION_DELAY_MS = 900;


export function WordFishingGame({
  items,
  speech,
  celebration,
  leaderboardContext,
  remoteConfigured,
  studentNameDraft,
  onStudentNameDraftChange,
  onBack,
}) {
  const fishingItems = useMemo(() => normalizeFishingItems(items), [items]);
  const totalRounds = Math.min(FISHING_MAX_ROUNDS, fishingItems.length);
  const canStart = fishingItems.length >= 2;
  const [phase, setPhase] = useState("ready");
  const [roundIndex, setRoundIndex] = useState(0);
  const [round, setRound] = useState(null);
  const [usedWordIds, setUsedWordIds] = useState([]);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [missCount, setMissCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(FISHING_ROUND_DURATION_SECONDS);
  const [feedbackMessage, setFeedbackMessage] = useState(
    "영어를 듣고 뜻 카드를 눌러보세요.",
  );
  const [feedbackTone, setFeedbackTone] = useState("idle");
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [reactionTotalMs, setReactionTotalMs] = useState(0);
  const [elapsedTotalMs, setElapsedTotalMs] = useState(0);

  const roundStartRef = useRef(0);
  const roundLockRef = useRef(false);
  const announcementRef = useRef("");
  const transitionTimerRef = useRef(null);
  const completionCelebratedRef = useRef(false);
  const cancelSpeech = speech?.cancel;

  useEffect(() => {
    cancelSpeech?.();
    window.clearTimeout(transitionTimerRef.current);
    roundLockRef.current = false;
    announcementRef.current = "";
    completionCelebratedRef.current = false;
    setPhase("ready");
    setRoundIndex(0);
    setRound(null);
    setUsedWordIds([]);
    setScore(0);
    setCorrectCount(0);
    setWrongCount(0);
    setMissCount(0);
    setTimeLeft(FISHING_ROUND_DURATION_SECONDS);
    setFeedbackMessage("영어를 듣고 뜻 카드를 눌러보세요.");
    setFeedbackTone("idle");
    setSelectedCandidateId("");
    setReactionTotalMs(0);
    setElapsedTotalMs(0);
  }, [items, cancelSpeech]);

  useEffect(() => {
    return () => {
      cancelSpeech?.();
      window.clearTimeout(transitionTimerRef.current);
    };
  }, [cancelSpeech]);

  function queueRound(nextUsedWordIds, nextRoundIndex) {
    const nextRound = createFishingRound(fishingItems, nextUsedWordIds, 6);

    if (!nextRound) {
      setPhase("complete");
      setRound(null);
      speech.cancel();
      return;
    }

    roundLockRef.current = false;
    announcementRef.current = "";
    roundStartRef.current = Date.now();
    setRound(nextRound);
    setRoundIndex(nextRoundIndex);
    setUsedWordIds((current) =>
      current.includes(nextRound.answer.id)
        ? current
        : [...current, nextRound.answer.id],
    );
    setTimeLeft(FISHING_ROUND_DURATION_SECONDS);
    setFeedbackMessage("영어를 듣고 맞는 뜻 카드를 낚아채 보세요.");
    setFeedbackTone("idle");
    setSelectedCandidateId("");
  }

  function completeGame() {
    speech.cancel();
    setPhase("complete");
    setRound(null);
  }

  function advanceRound() {
    const nextRoundNumber = roundIndex + 1;

    if (nextRoundNumber >= totalRounds || usedWordIds.length >= fishingItems.length) {
      completeGame();
      return;
    }

    queueRound(usedWordIds, nextRoundNumber);
  }

  function resolveRound(outcome, candidateId = "") {
    if (!round || roundLockRef.current) {
      return;
    }

    roundLockRef.current = true;
    setSelectedCandidateId(candidateId);
    const reactionMs =
      outcome === "timeout"
        ? ROUND_DURATION_MS
        : Math.max(0, Date.now() - roundStartRef.current);

    setElapsedTotalMs((current) => current + reactionMs);

    if (outcome === "correct") {
      speech.cancel();
      const gainedScore = calculateFishingScore({
        isCorrect: true,
        reactionMs,
        roundDurationMs: ROUND_DURATION_MS,
      });
      setScore((current) => current + gainedScore);
      setCorrectCount((current) => current + 1);
      setReactionTotalMs((current) => current + reactionMs);
      setFeedbackMessage(
        `정답! "${round.answer.word}"의 뜻인 "${round.answer.meaning}"를 정확히 낚았어요.`,
      );
      setFeedbackTone("correct");
      void celebration?.playSuccess?.();
    } else if (outcome === "wrong") {
      speech.cancel();
      setScore((current) => Math.max(0, current + calculateFishingScore({ isCorrect: false })));
      setWrongCount((current) => current + 1);
      setFeedbackMessage(`아쉬워요! 정답은 "${round.answer.meaning}"였어요.`);
      setFeedbackTone("wrong");
    } else {
      speech.cancel();
      setMissCount((current) => current + 1);
      setTimeLeft(0);
      setFeedbackMessage(`놓쳤어요! 정답은 "${round.answer.meaning}"였어요.`);
      setFeedbackTone("timeout");
    }

    window.clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = window.setTimeout(() => {
      advanceRound();
    }, TRANSITION_DELAY_MS);
  }

  const resolveRoundEvent = useEffectEvent(resolveRound);

  const announceRoundWord = useEffectEvent(() => {
    if (!round) {
      return;
    }

    speech.speak(round.answer.word, {
      lang: "en-US",
      rate: 0.88,
    });
  });

  useEffect(() => {
    if (phase !== "playing" || !round) {
      return;
    }

    if (announcementRef.current === round.id) {
      return;
    }

    announcementRef.current = round.id;
    announceRoundWord();
  }, [phase, round]);

  useEffect(() => {
    if (phase !== "playing" || !round) {
      return undefined;
    }

    roundStartRef.current = Date.now();
    roundLockRef.current = false;
    const deadline = Date.now() + ROUND_DURATION_MS;
    setTimeLeft(FISHING_ROUND_DURATION_SECONDS);

    const intervalId = window.setInterval(() => {
      const remainingMs = Math.max(0, deadline - Date.now());
      setTimeLeft(Math.ceil(remainingMs / 1000));
    }, 200);

    const timeoutId = window.setTimeout(() => {
      resolveRoundEvent("timeout");
    }, ROUND_DURATION_MS);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [phase, round]);

  useEffect(() => {
    if (phase !== "complete" || completionCelebratedRef.current) {
      return;
    }

    completionCelebratedRef.current = true;
    void celebration?.playCompletion?.();
  }, [celebration, phase]);

  function handleStart() {
    if (!canStart) {
      return;
    }

    speech.cancel();
    completionCelebratedRef.current = false;
    setScore(0);
    setCorrectCount(0);
    setWrongCount(0);
    setMissCount(0);
    setReactionTotalMs(0);
    setElapsedTotalMs(0);
    setUsedWordIds([]);
    setPhase("playing");
    queueRound([], 0);
  }

  function handleRetry() {
    handleStart();
  }

  function handleSelectCandidate(candidateId) {
    if (!round || roundLockRef.current) {
      return;
    }

    const chosen = round.candidates.find((candidate) => candidate.id === candidateId);
    if (!chosen) {
      return;
    }

    resolveRound(chosen.id === round.answer.id ? "correct" : "wrong", chosen.id);
  }

  const averageReaction = formatAverageReactionTime(
    reactionTotalMs,
    correctCount,
  );
  const elapsedSeconds = Math.max(0, Math.ceil(elapsedTotalMs / 1000));

  if (phase === "ready") {
    return (
      <FishingStartCard
        canStart={canStart}
        ttsSupported={speech.supported}
        itemCount={fishingItems.length}
        onStart={handleStart}
        onBack={onBack}
      />
    );
  }

  if (phase === "complete") {
    return (
      <FishingResultCard
        score={score}
        correctCount={correctCount}
        wrongCount={wrongCount}
        missCount={missCount}
        averageReaction={averageReaction}
        elapsedSeconds={elapsedSeconds}
        leaderboardContext={leaderboardContext}
        remoteConfigured={remoteConfigured}
        studentNameDraft={studentNameDraft}
        onStudentNameDraftChange={onStudentNameDraftChange}
        onRetry={handleRetry}
        onBack={onBack}
      />
    );
  }

  return (
    <section className="workspace-panel word-fishing-shell">
      <div className="section-heading">
        <div>
          <p className="mode-label">Word Fishing</p>
          <h2>단어 낚시</h2>
        </div>
        <button className="ghost-button" onClick={onBack}>
          홈으로
        </button>
      </div>

      <div className="quiz-grid word-fishing-grid">
        <div className="quiz-main">
          <article className="scoreboard-card">
            <div>
              <span>현재 문제</span>
              <strong>
                {Math.min(roundIndex + 1, totalRounds)} / {totalRounds}
              </strong>
            </div>
            <div>
              <span>현재 점수</span>
              <strong>{score}점</strong>
            </div>
            <div>
              <span>남은 시간</span>
              <strong>{timeLeft}초</strong>
            </div>
            <div>
              <span>정답 수</span>
              <strong>{correctCount}개</strong>
            </div>
          </article>

          <article className="question-card word-fishing-call-card">
            <div className="question-head">
              <div>
                <p className="mode-label">Current Catch</p>
                <h3>지금 읽은 영어 단어</h3>
              </div>
              <button
                className="secondary-button"
                onClick={() => round && speech.speak(round.answer.word, {
                  lang: "en-US",
                  rate: 0.88,
                })}
                disabled={!round || !speech.supported}
              >
                다시 듣기
              </button>
            </div>
            <div className="word-fishing-target">
              <strong>{round?.answer.word ?? ""}</strong>
              <span>TTS를 듣고 아래 떠다니는 뜻 카드 중 정답만 낚아채 보세요.</span>
            </div>
          </article>

          <article className="question-card word-fishing-board-card">
            <div className="question-head">
              <div>
                <p className="mode-label">Fishing Pool</p>
                <h3>뜻 카드 낚시터</h3>
              </div>
            </div>

            <div className="word-fishing-board" role="list" aria-label="단어 낚시 카드 영역">
              {round?.candidates.map((candidate) => {
                const isSelected = selectedCandidateId === candidate.id;
                const isAnswer = round.answer.id === candidate.id;
                const showCorrectAnswer =
                  roundLockRef.current && (feedbackTone === "wrong" || feedbackTone === "timeout") && isAnswer;
                const selectedCorrect = feedbackTone === "correct" && isSelected;

                let className = "word-fishing-card";
                if (isSelected) {
                  className += " word-fishing-card-selected";
                }
                if (selectedCorrect || showCorrectAnswer) {
                  className += " word-fishing-card-correct";
                } else if (feedbackTone === "wrong" && isSelected) {
                  className += " word-fishing-card-wrong";
                }

                return (
                  <button
                    key={candidate.id}
                    type="button"
                    className={className}
                    onClick={() => handleSelectCandidate(candidate.id)}
                    disabled={roundLockRef.current}
                    style={{
                      "--fishing-left": `${candidate.motion.left}%`,
                      "--fishing-top": `${candidate.motion.top}%`,
                      "--fishing-duration": `${candidate.motion.duration}s`,
                      "--fishing-delay": `${candidate.motion.delay}s`,
                      "--fishing-range-x": `${candidate.motion.rangeX}%`,
                      "--fishing-drift-y": `${candidate.motion.driftY}px`,
                      "--fishing-scale": candidate.motion.scale,
                    }}
                    role="listitem"
                  >
                    <span>{candidate.meaning}</span>
                  </button>
                );
              })}
            </div>
          </article>
        </div>

        <div className="quiz-side">
          <article className="hint-card">
            <p className="mode-label">Round Feedback</p>
            <h3>낚시 결과</h3>
            <div className={`feedback-card word-fishing-feedback word-fishing-feedback-${feedbackTone}`}>
              <p>{feedbackMessage}</p>
            </div>
            <div className="feedback-meta">
              <span>정답은 빠를수록 더 높은 점수를 받습니다.</span>
              <span>오답은 30점 감점, 시간 초과는 0점입니다.</span>
            </div>
          </article>

          <article className="hint-card">
            <p className="mode-label">Quick Tip</p>
            <h3>게임 팁</h3>
            <p className="question-copy">
              카드는 계속 떠다니지만 한 라운드에는 한 번만 선택할 수 있습니다.
              먼저 눈으로 위치를 잡고, 들리는 영어와 맞는 뜻만 빠르게 눌러보세요.
            </p>
            <div className="progression-metrics">
              <div className="progression-metric">
                <span>평균 반응</span>
                <strong>{averageReaction}</strong>
              </div>
              <div className="progression-metric">
                <span>남은 라운드</span>
                <strong>{Math.max(totalRounds - roundIndex - 1, 0)}개</strong>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
