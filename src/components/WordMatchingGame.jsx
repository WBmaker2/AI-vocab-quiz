import { useEffect, useMemo, useRef, useState } from "react";
import {
  advanceMatchingBoard,
  calculateMatchingScore,
  createMatchingGameState,
  formatElapsedSeconds,
} from "../utils/quiz.js";

function MatchingSummary({
  solvedPairs,
  elapsedSeconds,
  finalScore,
  onRetry,
  onChooseUnits,
  onBack,
}) {
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
  speech,
  celebration,
  onBack,
  onChooseUnits,
}) {
  const [gameState, setGameState] = useState(() => createMatchingGameState(items));
  const [selectedMeaningIndex, setSelectedMeaningIndex] = useState(-1);
  const [selectedWordIndex, setSelectedWordIndex] = useState(-1);
  const [mismatchPair, setMismatchPair] = useState(null);
  const [solvedPairs, setSolvedPairs] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isComplete, setIsComplete] = useState(items.length > 0 && createMatchingGameState(items).totalPairs === 0);
  const completionCelebratedRef = useRef(false);

  useEffect(() => {
    const nextState = createMatchingGameState(items);
    setGameState(nextState);
    setSelectedMeaningIndex(-1);
    setSelectedWordIndex(-1);
    setMismatchPair(null);
    setSolvedPairs(0);
    setElapsedSeconds(0);
    setIsComplete(nextState.totalPairs === 0);
    completionCelebratedRef.current = false;
  }, [items]);

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
    if (selectedMeaningIndex === -1 || selectedWordIndex === -1 || mismatchPair) {
      return undefined;
    }

    const meaningCard = gameState.leftCards[selectedMeaningIndex];
    const wordCard = gameState.rightCards[selectedWordIndex];

    if (!meaningCard || !wordCard) {
      return undefined;
    }

    if (meaningCard.pairId === wordCard.pairId) {
      const nextState = advanceMatchingBoard({
        leftCards: gameState.leftCards,
        rightCards: gameState.rightCards,
        remainingPairs: gameState.remainingPairs,
        leftIndex: selectedMeaningIndex,
        rightIndex: selectedWordIndex,
      });
      const nextSolvedPairs = solvedPairs + 1;

      setSolvedPairs(nextSolvedPairs);
      setGameState(nextState);
      setSelectedMeaningIndex(-1);
      setSelectedWordIndex(-1);
      void celebration?.playSuccess?.();

      if (nextState.leftCards.length === 0 && nextState.remainingPairs.length === 0) {
        setIsComplete(true);
      }

      return undefined;
    }

    setMismatchPair({
      leftIndex: selectedMeaningIndex,
      rightIndex: selectedWordIndex,
    });
    return undefined;
  }, [
    celebration,
    gameState.leftCards,
    gameState.remainingPairs,
    gameState.rightCards,
    mismatchPair,
    selectedMeaningIndex,
    selectedWordIndex,
    solvedPairs,
  ]);

  useEffect(() => {
    if (!mismatchPair) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSelectedMeaningIndex(-1);
      setSelectedWordIndex(-1);
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

  function handleSelectMeaning(index) {
    if (isComplete || mismatchPair) {
      return;
    }

    setSelectedMeaningIndex((current) => (current === index ? -1 : index));
  }

  function handleSelectWord(index, card) {
    if (isComplete || mismatchPair) {
      return;
    }

    speech.speak(card.word, {
      lang: "en-US",
      rate: 0.9,
    });
    setSelectedWordIndex((current) => (current === index ? -1 : index));
  }

  function handleRetry() {
    const nextState = createMatchingGameState(items);
    setGameState(nextState);
    setSelectedMeaningIndex(-1);
    setSelectedWordIndex(-1);
    setMismatchPair(null);
    setSolvedPairs(0);
    setElapsedSeconds(0);
    setIsComplete(nextState.totalPairs === 0);
    completionCelebratedRef.current = false;
  }

  function getCardClassName({ isSelected, isMismatched, side }) {
    return [
      "matching-card",
      side === "word" ? "matching-card-word" : "matching-card-meaning",
      isSelected ? "matching-card-selected" : "",
      isMismatched ? "matching-card-mismatch" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (items.length === 0 || gameState.totalPairs === 0) {
    return (
      <section className="workspace-panel">
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
            <button className="secondary-button" onClick={onOpenTeacher}>
              Teacher Mode 열기
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
          onRetry={handleRetry}
          onChooseUnits={onChooseUnits}
          onBack={onBack}
        />
      </section>
    );
  }

  return (
    <section className="workspace-panel">
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

            {mismatchPair ? (
              <div className="feedback-card matching-feedback-card" aria-live="polite">
                <p>짝이 아니에요. 바로 다시 골라보세요.</p>
              </div>
            ) : null}

            <div className="matching-columns">
              <div className="matching-column">
                {gameState.leftCards.map((card, index) => {
                  const isSelected = selectedMeaningIndex === index;
                  const isMismatched = mismatchPair?.leftIndex === index;

                  return (
                    <button
                      key={card.slotId}
                      className={getCardClassName({
                        isSelected,
                        isMismatched,
                        side: "meaning",
                      })}
                      onClick={() => handleSelectMeaning(index)}
                    >
                      {card.label}
                    </button>
                  );
                })}
              </div>

              <div className="matching-column">
                {gameState.rightCards.map((card, index) => {
                  const isSelected = selectedWordIndex === index;
                  const isMismatched = mismatchPair?.rightIndex === index;

                  return (
                    <button
                      key={card.slotId}
                      className={getCardClassName({
                        isSelected,
                        isMismatched,
                        side: "word",
                      })}
                      onClick={() => handleSelectWord(index, card)}
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
            <p className="result-score">{finalScore}</p>
            <p className="result-copy">
              맞춘 문제 수가 많을수록 올라가고, 시간이 길수록 조금씩 줄어듭니다.
            </p>
          </article>
        </aside>
      </div>
    </section>
  );
}
