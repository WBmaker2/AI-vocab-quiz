import { useEffect, useMemo, useRef, useState } from "react";
import { saveStudentProgress } from "../lib/firebase.js";
import { GameLeaderboardPanel } from "./GameLeaderboardPanel.jsx";
import { StudentProgressPanel } from "./StudentProgressPanel.jsx";
import {
  advanceMatchingBoard,
  calculateMatchingScore,
  createMatchingGameState,
  formatElapsedSeconds,
} from "../utils/quiz.js";

const MATCH_FADE_DURATION_MS = 3000;

function MatchingSummary({
  solvedPairs,
  elapsedSeconds,
  finalScore,
  leaderboardContext,
  progressionContext,
  remoteConfigured,
  studentNameDraft,
  onStudentNameDraftChange,
  onRetry,
  onChooseUnits,
  onBack,
}) {
  const [progressionLoading, setProgressionLoading] = useState(false);
  const [progressionStatus, setProgressionStatus] = useState("");
  const [progressionError, setProgressionError] = useState("");
  const [progressionComparison, setProgressionComparison] = useState(null);
  const [newlyEarnedBadges, setNewlyEarnedBadges] = useState([]);
  const [progressionStudentName, setProgressionStudentName] = useState("");
  const progressionSchoolId = String(progressionContext?.schoolId ?? "").trim();
  const progressionSchoolName = String(progressionContext?.schoolName ?? "").trim();
  const progressionGrade = String(progressionContext?.grade ?? "").trim();
  const canSaveProgress =
    remoteConfigured &&
    progressionSchoolId &&
    progressionSchoolName &&
    progressionGrade;

  useEffect(() => {
    setProgressionLoading(false);
    setProgressionStatus("");
    setProgressionError("");
    setProgressionComparison(null);
    setNewlyEarnedBadges([]);
    setProgressionStudentName("");
  }, [finalScore, solvedPairs, elapsedSeconds, progressionSchoolId, progressionGrade]);

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

  async function handleSaveProgress() {
    const cleanStudentName = String(studentNameDraft ?? "")
      .trim()
      .replace(/\s+/g, " ");

    if (!canSaveProgress) {
      setProgressionError("학교와 학년 정보를 확인한 뒤 다시 시도해 주세요.");
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
        schoolId: progressionSchoolId,
        schoolName: progressionSchoolName,
        grade: progressionGrade,
        studentName: cleanStudentName,
        activityType: "matching",
        result: {
          score: finalScore,
          elapsedSeconds,
          solvedPairs,
        },
      });

      onStudentNameDraftChange?.(cleanStudentName);
      setProgressionStudentName(cleanStudentName);
      setProgressionComparison(saved.comparison);
      setNewlyEarnedBadges(saved.newlyEarnedBadges ?? []);
      setProgressionStatus(
        `${cleanStudentName} 학생의 짝 맞추기 성장 기록을 저장했습니다.`,
      );
    } catch (error) {
      setProgressionError(error?.message || "개인 기록을 저장하지 못했습니다.");
    } finally {
      setProgressionLoading(false);
    }
  }

  const progressionDisabledReason = !remoteConfigured
    ? "Firebase 연결이 없어 이 기기에서는 개인 기록을 저장할 수 없습니다."
    : !progressionSchoolId || !progressionSchoolName || !progressionGrade
      ? "학교와 학년을 먼저 선택하면 개인 최고 기록과 배지를 저장할 수 있어요."
      : !String(studentNameDraft ?? "").trim()
        ? "학생 이름을 입력하면 개인 최고 기록과 배지를 저장할 수 있어요."
        : "";
  const hasSavedProgress = Boolean(progressionStudentName);

  return (
    <article className="result-card">
      <p className="mode-label">Matching Result</p>
      <h3>단어 짝 맞추기 완료</h3>
      <p className="result-score">{finalScore}점</p>
      <div className="matching-result-grid">
        <div className="summary-card">
          <span>맞춘 문제 수</span>
          <strong>{solvedPairs}개</strong>
        </div>
        <div className="summary-card">
          <span>걸린 시간</span>
          <strong>{formatElapsedSeconds(elapsedSeconds)}</strong>
        </div>
      </div>
      <p className="result-copy">
        맞춘 문제 수와 걸린 시간을 반영해 최종 점수를 계산했습니다.
      </p>
      <section className="result-progression-block">
        <div className="matching-leaderboard-head">
          <div>
            <p className="mode-label">Student Progress</p>
            <h4>개인 최고 기록과 배지를 저장할까요?</h4>
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
          title="짝 맞추기 성장 기록"
        />
      </section>

      <GameLeaderboardPanel
        activityType="matching"
        finalScore={finalScore}
        elapsedSeconds={elapsedSeconds}
        leaderboardContext={leaderboardContext}
        remoteConfigured={remoteConfigured}
        studentNameDraft={studentNameDraft}
        onStudentNameDraftChange={onStudentNameDraftChange}
        metrics={{ solvedPairs }}
      />

      <div className="toolbar-row">
        <button className="primary-button" onClick={onRetry}>
          다시 하기
        </button>
        <button className="secondary-button" onClick={onChooseUnits}>
          게임 단원 선택
        </button>
        <button className="ghost-button" onClick={onBack}>
          홈으로
        </button>
      </div>
    </article>
  );
}

export function WordMatchingGame({
  items,
  selectedUnits,
  leaderboardContext,
  progressionContext,
  remoteConfigured,
  studentNameDraft,
  onStudentNameDraftChange,
  speech,
  celebration,
  onBack,
  onChooseUnits,
}) {
  const [gameState, setGameState] = useState(() => createMatchingGameState(items));
  const [selectedMeaningSlotId, setSelectedMeaningSlotId] = useState("");
  const [selectedWordSlotId, setSelectedWordSlotId] = useState("");
  const [mismatchPair, setMismatchPair] = useState(null);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [solvedPairs, setSolvedPairs] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isComplete, setIsComplete] = useState(items.length > 0 && createMatchingGameState(items).totalPairs === 0);
  const completionCelebratedRef = useRef(false);
  const matchTimeoutsRef = useRef(new Map());

  function clearPendingMatchTimeouts() {
    matchTimeoutsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    matchTimeoutsRef.current.clear();
  }

  function scheduleMatchedPairRemoval(matchEntry) {
    const timeoutId = window.setTimeout(() => {
      setGameState((current) => {
        const leftIndex = current.leftCards.findIndex(
          (card) => card.slotId === matchEntry.leftSlotId,
        );
        const rightIndex = current.rightCards.findIndex(
          (card) => card.slotId === matchEntry.rightSlotId,
        );

        if (leftIndex === -1 || rightIndex === -1) {
          return current;
        }

        const nextState = advanceMatchingBoard({
          leftCards: current.leftCards,
          rightCards: current.rightCards,
          remainingPairs: current.remainingPairs,
          leftIndex,
          rightIndex,
        });

        return nextState;
      });

      setMatchedPairs((current) =>
        current.filter((entry) => entry.id !== matchEntry.id),
      );

      matchTimeoutsRef.current.delete(matchEntry.id);
    }, MATCH_FADE_DURATION_MS);

    matchTimeoutsRef.current.set(matchEntry.id, timeoutId);
  }

  useEffect(() => {
    clearPendingMatchTimeouts();
    const nextState = createMatchingGameState(items);
    setGameState(nextState);
    setSelectedMeaningSlotId("");
    setSelectedWordSlotId("");
    setMismatchPair(null);
    setMatchedPairs([]);
    setSolvedPairs(0);
    setElapsedSeconds(0);
    setIsComplete(nextState.totalPairs === 0);
    completionCelebratedRef.current = false;
  }, [items]);

  useEffect(() => {
    return () => {
      clearPendingMatchTimeouts();
    };
  }, []);

  useEffect(() => {
    if (isComplete || gameState.totalPairs === 0) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [gameState.totalPairs, isComplete]);

  useEffect(() => {
    if (!isComplete || completionCelebratedRef.current) {
      return;
    }

    completionCelebratedRef.current = true;
    void celebration?.playCompletion?.();
  }, [celebration, isComplete]);

  useEffect(() => {
    const boardIsEmpty =
      items.length > 0 &&
      gameState.leftCards.length === 0 &&
      gameState.rightCards.length === 0 &&
      gameState.remainingPairs.length === 0 &&
      matchedPairs.length === 0;

    if (boardIsEmpty) {
      setIsComplete(true);
    }
  }, [
    gameState.leftCards.length,
    gameState.remainingPairs.length,
    gameState.rightCards.length,
    items.length,
    matchedPairs.length,
  ]);

  useEffect(() => {
    if (!selectedMeaningSlotId || !selectedWordSlotId || mismatchPair) {
      return undefined;
    }

    const meaningCard = gameState.leftCards.find(
      (card) => card.slotId === selectedMeaningSlotId,
    );
    const wordCard = gameState.rightCards.find(
      (card) => card.slotId === selectedWordSlotId,
    );

    if (!meaningCard || !wordCard) {
      setSelectedMeaningSlotId("");
      setSelectedWordSlotId("");
      return undefined;
    }

    if (meaningCard.pairId === wordCard.pairId) {
      const matchEntry = {
        id: crypto.randomUUID(),
        leftSlotId: meaningCard.slotId,
        rightSlotId: wordCard.slotId,
      };

      setMatchedPairs((current) => [...current, matchEntry]);
      setSolvedPairs((current) => current + 1);
      setSelectedMeaningSlotId("");
      setSelectedWordSlotId("");
      void celebration?.playSuccess?.();
      scheduleMatchedPairRemoval(matchEntry);

      return undefined;
    }

    setMismatchPair({
      leftSlotId: meaningCard.slotId,
      rightSlotId: wordCard.slotId,
    });
    return undefined;
  }, [
    celebration,
    gameState.leftCards,
    gameState.remainingPairs,
    gameState.rightCards,
    mismatchPair,
    selectedMeaningSlotId,
    selectedWordSlotId,
  ]);

  useEffect(() => {
    if (!mismatchPair) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSelectedMeaningSlotId("");
      setSelectedWordSlotId("");
      setMismatchPair(null);
    }, 360);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [mismatchPair]);

  const activePairCount = gameState.leftCards.length;
  const finalScore = useMemo(
    () => calculateMatchingScore({ solvedPairs, elapsedSeconds }),
    [elapsedSeconds, solvedPairs],
  );
  const unitLabel = selectedUnits.length > 0
    ? `${selectedUnits.join(", ")}단원`
    : "선택 단원 없음";

  function isMatchedSlot(slotId) {
    return matchedPairs.some(
      (entry) => entry.leftSlotId === slotId || entry.rightSlotId === slotId,
    );
  }

  function handleSelectMeaning(card) {
    if (isComplete || mismatchPair || isMatchedSlot(card.slotId)) {
      return;
    }

    setSelectedMeaningSlotId((current) =>
      current === card.slotId ? "" : card.slotId,
    );
  }

  function handleSelectWord(card) {
    if (isComplete || mismatchPair || isMatchedSlot(card.slotId)) {
      return;
    }

    speech.speak(card.word, {
      lang: "en-US",
      rate: 0.9,
    });
    setSelectedWordSlotId((current) =>
      current === card.slotId ? "" : card.slotId,
    );
  }

  function handleRetry() {
    clearPendingMatchTimeouts();
    const nextState = createMatchingGameState(items);
    setGameState(nextState);
    setSelectedMeaningSlotId("");
    setSelectedWordSlotId("");
    setMismatchPair(null);
    setMatchedPairs([]);
    setSolvedPairs(0);
    setElapsedSeconds(0);
    setIsComplete(nextState.totalPairs === 0);
    completionCelebratedRef.current = false;
  }

  function getCardClassName({ isSelected, isMismatched, isMatched, side }) {
    return [
      "matching-card",
      side === "word" ? "matching-card-word" : "matching-card-meaning",
      isSelected ? "matching-card-selected" : "",
      isMismatched ? "matching-card-mismatch" : "",
      isMatched ? "matching-card-matched" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (items.length === 0 || gameState.totalPairs === 0) {
    return (
      <section
        className="workspace-panel"
        style={{ "--matching-card-fade-duration": `${MATCH_FADE_DURATION_MS}ms` }}
      >
        <div className="section-heading">
          <div>
            <p className="mode-label">Word Matching Game</p>
            <h2>단어 짝 맞추기</h2>
          </div>
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>

        <article className="empty-card">
          <h3>먼저 게임용 단어를 준비하세요</h3>
          <p>
            학교, 선생님, 학년을 선택한 뒤 한 개 이상의 단원을 체크해서
            짝 맞추기 게임을 시작할 수 있습니다.
          </p>
          <div className="toolbar-row">
            <button className="ghost-button" onClick={onBack}>
              홈으로
            </button>
            <button className="secondary-button" onClick={onChooseUnits}>
              게임 단원 선택
            </button>
          </div>
        </article>
      </section>
    );
  }

  if (isComplete) {
    return (
      <section
        className="workspace-panel"
        style={{ "--matching-card-fade-duration": `${MATCH_FADE_DURATION_MS}ms` }}
      >
        <div className="section-heading">
          <div>
            <p className="mode-label">Word Matching Game</p>
            <h2>단어 짝 맞추기 완료</h2>
          </div>
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>

        <MatchingSummary
          solvedPairs={solvedPairs}
          elapsedSeconds={elapsedSeconds}
          finalScore={finalScore}
          leaderboardContext={leaderboardContext}
          progressionContext={progressionContext}
          remoteConfigured={remoteConfigured}
          studentNameDraft={studentNameDraft}
          onStudentNameDraftChange={onStudentNameDraftChange}
          onRetry={handleRetry}
          onChooseUnits={onChooseUnits}
          onBack={onBack}
        />
      </section>
    );
  }

  return (
    <section
      className="workspace-panel"
      style={{ "--matching-card-fade-duration": `${MATCH_FADE_DURATION_MS}ms` }}
    >
      <div className="section-heading">
        <div>
          <p className="mode-label">Word Matching Game</p>
          <h2>단어 짝 맞추기</h2>
        </div>
        <button className="ghost-button" onClick={onBack}>
          홈으로
        </button>
      </div>

      <div className="quiz-grid">
        <div className="quiz-main">
          <article className="scoreboard-card">
            <div>
              <span>선택 단원</span>
              <strong>{unitLabel}</strong>
            </div>
            <div>
              <span>현재 시간</span>
              <strong>{formatElapsedSeconds(elapsedSeconds)}</strong>
            </div>
          </article>

          <article className="question-card matching-board-card">
            <div className="question-head">
              <div>
                <p className="mode-label">Matching Board</p>
                <h3>뜻 카드와 영어 카드를 짝지어 보세요</h3>
              </div>
              <div className="matching-stats">
                <span>{solvedPairs}개 맞춤</span>
                <span>{activePairCount}쌍 진행 중</span>
              </div>
            </div>

            <p className="question-copy">
              영어 카드를 누르면 발음을 들을 수 있습니다. 왼쪽 뜻 카드 1개와
              오른쪽 영어 카드 1개를 선택해 짝을 맞추세요.
            </p>

            <div className="matching-columns">
              <div className="matching-column">
                {gameState.leftCards.map((card) => {
                  const isSelected = selectedMeaningSlotId === card.slotId;
                  const isMismatched = mismatchPair?.leftSlotId === card.slotId;
                  const isMatched = isMatchedSlot(card.slotId);

                  return (
                    <button
                      key={card.slotId}
                      className={getCardClassName({
                        isSelected,
                        isMismatched,
                        isMatched,
                        side: "meaning",
                      })}
                      onClick={() => handleSelectMeaning(card)}
                    >
                      {card.label}
                    </button>
                  );
                })}
              </div>

              <div className="matching-column">
                {gameState.rightCards.map((card) => {
                  const isSelected = selectedWordSlotId === card.slotId;
                  const isMismatched = mismatchPair?.rightSlotId === card.slotId;
                  const isMatched = isMatchedSlot(card.slotId);

                  return (
                    <button
                      key={card.slotId}
                      className={getCardClassName({
                        isSelected,
                        isMismatched,
                        isMatched,
                        side: "word",
                      })}
                      onClick={() => handleSelectWord(card)}
                    >
                      {card.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </article>
        </div>

        <aside className="quiz-side">
          <article className="hint-card">
            <p className="mode-label">Game Tip</p>
            <h3>진행 팁</h3>
            <p>
              영어 카드를 눌러 발음을 듣고, 뜻 카드를 비교하면서 빠르게 짝을
              맞추면 더 높은 점수를 받을 수 있습니다.
            </p>
          </article>

          <article className="hint-card">
            <p className="mode-label">Score Rule</p>
            <h3>점수 계산</h3>
            <p className="result-score">{finalScore}점</p>
            <p className="result-copy">
              맞춘 문제 수가 많을수록 올라가고, 시간이 길수록 조금씩 줄어듭니다.
            </p>
          </article>
        </aside>
      </div>
    </section>
  );
}
