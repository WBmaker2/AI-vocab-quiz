import { useEffect, useMemo, useRef, useState } from "react";
import {
  chunkToGrid,
  chunkWords,
  createEmptySetupCell,
  createSetupBoardKey,
  deriveSetupBoardSize,
  getMillis,
  normalizeSetupBoardCells,
  normalizeTile,
  normalizeWord,
} from "../utils/bingoBoard.js";
import { StudentBingoSetupBoard } from "./bingo/StudentBingoSetupBoard.jsx";
import { StudentBingoPlayHeader } from "./bingo/StudentBingoPlayHeader.jsx";


export function StudentBingoBoard({
  sessionCode = "",
  playerName = "",
  boardTitle = "영어 단어 빙고 보드",
  boardWords = [],
  setupStatus = "arranging",
  availableWords = [],
  requiredCellCount = 0,
  setupStartedAt = null,
  setupCompletedAt = null,
  playerId = "",
  actionLoading = false,
  currentWordId = "",
  currentWord = "",
  currentWordSource = "",
  bingoCount = 0,
  claimedWords = [],
  completedWords = [],
  lockedWords = [],
  statusMessage = "",
  errorMessage = "",
  roundLabel = "",
  canContinue = true,
  onSaveSetupDraft,
  onFinalizeSetup,
  onCheckWord,
  onBack,
}) {
  const [localError, setLocalError] = useState("");
  const [selectedSetupWordId, setSelectedSetupWordId] = useState("");
  const [draggedSetupWordId, setDraggedSetupWordId] = useState("");
  const [setupSecondsLeft, setSetupSecondsLeft] = useState(60);
  const [setupDraftCells, setSetupDraftCells] = useState([]);
  const [setupFinalizeMode, setSetupFinalizeMode] = useState("");

  const saveDraftTimerRef = useRef(null);
  const autoFinalizeTriggeredRef = useRef(false);
  const lastSavedSetupKeyRef = useRef("");

  const sourceBoard = Array.isArray(boardWords) ? boardWords : [];
  const sourceTiles = Array.isArray(sourceBoard[0]) ? sourceBoard.flat() : sourceBoard;
  const normalizedTiles = useMemo(
    () => sourceTiles.map(normalizeTile).filter((tile) => tile.word),
    [sourceTiles],
  );
  const normalizedAvailableWords = useMemo(
    () =>
      (Array.isArray(availableWords) ? availableWords : [])
        .map((item, index) => normalizeTile(item, index))
        .filter((tile) => tile.word && tile.wordId),
    [availableWords],
  );
  const gameplayBoardRows = useMemo(() => {
    if (Array.isArray(sourceBoard[0])) {
      return sourceBoard.map((row, rowIndex) =>
        row.map((tile, tileIndex) => normalizeTile(tile, rowIndex * 20 + tileIndex)),
      );
    }

    const size = Math.max(1, Math.ceil(Math.sqrt(normalizedTiles.length || 1)));
    return chunkWords(normalizedTiles, size);
  }, [normalizedTiles, sourceBoard]);
  const setupBoardSize = useMemo(
    () => deriveSetupBoardSize(boardWords, requiredCellCount, availableWords),
    [availableWords, boardWords, requiredCellCount],
  );

  useEffect(() => {
    setLocalError("");
  }, [currentWord, sourceBoard]);

  useEffect(() => {
    if (setupStatus === "ready") {
      return;
    }

    const nextDraft = normalizeSetupBoardCells(
      boardWords,
      setupBoardSize,
      normalizedAvailableWords,
    );

    setSetupDraftCells(nextDraft);
    setSelectedSetupWordId("");
    setDraggedSetupWordId("");
    lastSavedSetupKeyRef.current = createSetupBoardKey(nextDraft);
  }, [boardWords, normalizedAvailableWords, setupBoardSize, setupStatus]);

  useEffect(() => {
    if (setupStatus !== "arranging") {
      setSetupSecondsLeft(60);
      autoFinalizeTriggeredRef.current = false;
      return undefined;
    }

    const startedMillis = getMillis(setupStartedAt) || Date.now();

    function updateCountdown() {
      const elapsedSeconds = Math.floor((Date.now() - startedMillis) / 1000);
      const remaining = Math.max(0, 60 - elapsedSeconds);
      setSetupSecondsLeft(remaining);
    }

    updateCountdown();
    const timerId = window.setInterval(updateCountdown, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [setupStartedAt, setupStatus]);

  useEffect(() => {
    if (setupStatus !== "arranging") {
      return undefined;
    }

    if (!onSaveSetupDraft || !playerId || setupDraftCells.length === 0) {
      return undefined;
    }

    const nextKey = createSetupBoardKey(setupDraftCells);
    if (nextKey === lastSavedSetupKeyRef.current) {
      return undefined;
    }

    if (saveDraftTimerRef.current) {
      window.clearTimeout(saveDraftTimerRef.current);
    }

    saveDraftTimerRef.current = window.setTimeout(async () => {
      try {
        await onSaveSetupDraft({ boardCells: setupDraftCells });
        lastSavedSetupKeyRef.current = nextKey;
      } catch (error) {
        setLocalError(
          error?.message ?? "빙고판 배치 상태를 저장하지 못했습니다.",
        );
      }
    }, 280);

    return () => {
      if (saveDraftTimerRef.current) {
        window.clearTimeout(saveDraftTimerRef.current);
      }
    };
  }, [onSaveSetupDraft, playerId, setupDraftCells, setupStatus]);

  useEffect(() => {
    if (setupStatus !== "arranging") {
      return;
    }

    if (setupSecondsLeft > 0) {
      return;
    }

    if (autoFinalizeTriggeredRef.current) {
      return;
    }

    autoFinalizeTriggeredRef.current = true;

    const finalizePromise = onFinalizeSetup?.({
      boardCells: setupDraftCells,
      autoFillRemaining: true,
    });

    if (finalizePromise?.catch) {
      finalizePromise.catch((error) => {
        autoFinalizeTriggeredRef.current = false;
        setLocalError(error?.message ?? "빙고판 자동 완성에 실패했습니다.");
      });
    }
  }, [onFinalizeSetup, setupDraftCells, setupSecondsLeft, setupStatus]);

  const claimedSet = useMemo(
    () => new Set(claimedWords.map((word) => String(word ?? "").trim()).filter(Boolean)),
    [claimedWords],
  );
  const completedSet = useMemo(
    () => new Set(completedWords.map((word) => String(word ?? "").trim()).filter(Boolean)),
    [completedWords],
  );
  const lockedSet = useMemo(
    () => new Set(lockedWords.map((word) => String(word ?? "").trim()).filter(Boolean)),
    [lockedWords],
  );

  const visibleCurrentWord = String(currentWord ?? "").trim();
  const normalizedCurrentWordId = normalizeWord(currentWordId);
  const normalizedCurrentWord = normalizeWord(visibleCurrentWord);
  const hasCurrentWord = Boolean(visibleCurrentWord) || Boolean(normalizedCurrentWordId);
  const gridColumns = Math.max(1, gameplayBoardRows[0]?.length ?? 1);
  const currentCallLabel = visibleCurrentWord || normalizedCurrentWordId || "아직 호출된 단어가 없습니다.";
  const setupWordMap = useMemo(
    () => new Map(normalizedAvailableWords.map((item) => [item.wordId, item])),
    [normalizedAvailableWords],
  );
  const placedWordIds = useMemo(
    () =>
      new Set(
        setupDraftCells
          .map((cell) => String(cell.wordId ?? "").trim())
          .filter(Boolean),
      ),
    [setupDraftCells],
  );
  const trayWords = useMemo(
    () => normalizedAvailableWords.filter((word) => !placedWordIds.has(word.wordId)),
    [normalizedAvailableWords, placedWordIds],
  );
  const setupGridRows = useMemo(
    () => chunkToGrid(setupDraftCells, setupBoardSize),
    [setupDraftCells, setupBoardSize],
  );
  const setupBoardComplete = setupDraftCells.every((cell) => Boolean(cell.wordId));
  const setupCountdownWarning = setupSecondsLeft <= 10;
  const setupCountLabel = `${setupDraftCells.filter((cell) => Boolean(cell.wordId)).length}/${setupDraftCells.length || 0}`;

  function clearSelection() {
    setSelectedSetupWordId("");
    setDraggedSetupWordId("");
  }

  function placeSetupWord(wordId, targetIndex) {
    const cleanWordId = String(wordId ?? "").trim();
    if (!cleanWordId) {
      return;
    }

    const sourceWord = setupWordMap.get(cleanWordId);
    if (!sourceWord && !setupDraftCells.some((cell) => cell.wordId === cleanWordId)) {
      return;
    }

    setSetupDraftCells((current) => {
      const next = current.map((cell) => ({ ...cell }));
      const sourceIndex = next.findIndex((cell) => cell.wordId === cleanWordId);
      const targetCell = next[targetIndex] ?? createEmptySetupCell(setupBoardSize, targetIndex);

      if (sourceIndex === targetIndex) {
        return current;
      }

      const wordData = sourceIndex >= 0 ? next[sourceIndex] : sourceWord;
      if (!wordData) {
        return current;
      }

      if (sourceIndex >= 0) {
        if (targetCell.wordId) {
          next[sourceIndex] = {
            ...targetCell,
            index: sourceIndex,
            row: Math.floor(sourceIndex / setupBoardSize),
            column: sourceIndex % setupBoardSize,
          };
        } else {
          next[sourceIndex] = createEmptySetupCell(setupBoardSize, sourceIndex);
        }
      }

      next[targetIndex] = {
        ...wordData,
        index: targetIndex,
        row: Math.floor(targetIndex / setupBoardSize),
        column: targetIndex % setupBoardSize,
      };

      return next;
    });
  }

  function handleSetupWordClick(wordId) {
    const cleanWordId = String(wordId ?? "").trim();
    if (!cleanWordId) {
      return;
    }

    setSelectedSetupWordId((current) => (current === cleanWordId ? "" : cleanWordId));
  }

  function handleSetupCellClick(cell, cellIndex) {
    const cleanCellWordId = String(cell?.wordId ?? "").trim();

    if (selectedSetupWordId) {
      placeSetupWord(selectedSetupWordId, cellIndex);
      clearSelection();
      return;
    }

    if (cleanCellWordId) {
      handleSetupWordClick(cleanCellWordId);
    }
  }

  function handleSetupCellDrop(event, cellIndex) {
    event.preventDefault();
    const droppedWordId = String(
      event.dataTransfer.getData("text/plain") || draggedSetupWordId || selectedSetupWordId,
    ).trim();

    if (!droppedWordId) {
      return;
    }

    placeSetupWord(droppedWordId, cellIndex);
    clearSelection();
  }

  function handleSetupTrayDragStart(wordId) {
    setDraggedSetupWordId(wordId);
    setSelectedSetupWordId(wordId);
  }

  function handleSetupBoardDragStart(wordId) {
    setDraggedSetupWordId(wordId);
    setSelectedSetupWordId(wordId);
  }

  async function handleFinalizeSetup(autoFillRemaining = false) {
    if (!onFinalizeSetup) {
      return;
    }

    setLocalError("");
    setSetupFinalizeMode(autoFillRemaining ? "random" : "manual");

    try {
      await onFinalizeSetup({
        boardCells: setupDraftCells,
        autoFillRemaining,
      });
      clearSelection();
    } catch (error) {
      setLocalError(error?.message ?? "빙고판 배치를 완료하지 못했습니다.");
    } finally {
      setSetupFinalizeMode("");
    }
  }

  if (setupStatus !== "ready") {
    return <StudentBingoSetupBoard boardTitle={boardTitle} onBack={onBack} sessionCode={sessionCode} playerName={playerName} roundLabel={roundLabel} setupCountdownWarning={setupCountdownWarning} setupSecondsLeft={setupSecondsLeft} setupBoardComplete={setupBoardComplete} setupCountLabel={setupCountLabel} setupBoardSize={setupBoardSize} setupGridRows={setupGridRows} selectedSetupWordId={selectedSetupWordId} handleSetupCellClick={handleSetupCellClick} handleSetupCellDrop={handleSetupCellDrop} handleSetupBoardDragStart={handleSetupBoardDragStart} localError={localError} statusMessage={statusMessage} actionLoading={actionLoading} setupFinalizeMode={setupFinalizeMode} handleFinalizeSetup={handleFinalizeSetup} trayWords={trayWords} handleSetupWordClick={handleSetupWordClick} handleSetupTrayDragStart={handleSetupTrayDragStart} setupDraftCells={setupDraftCells} />;
  }


  const boardStateLabel = canContinue ? "진행 중" : "종료됨";

  return (
    <section className="workspace-panel bingo-board-shell">
      <StudentBingoPlayHeader boardTitle={boardTitle} onBack={onBack} sessionCode={sessionCode} playerName={playerName} boardStateLabel={boardStateLabel} roundLabel={roundLabel} setupCompletedAt={setupCompletedAt} />

      <div className="bingo-board-grid">
        <article className="bingo-card bingo-call-card">
          <div className="bingo-card-head">
            <div>
              <p className="mode-label">Current Call</p>
              <h3>선생님이 부른 단어</h3>
            </div>
            <span className="bingo-status-chip">{currentWordSource || "대기"}</span>
          </div>

          <div className="bingo-current-word bingo-current-word-small">{currentCallLabel}</div>
          <p className="bingo-call-helper">
            선생님이 부른 영단어를 보드에서 직접 찾아 눌러야 체크됩니다.
          </p>

          {statusMessage ? <p className="bingo-host-status">{statusMessage}</p> : null}
          {errorMessage ? <p className="bingo-host-status bingo-host-status-error">{errorMessage}</p> : null}
          {localError ? <p className="bingo-host-status bingo-host-status-error">{localError}</p> : null}

          <div className="bingo-metric-row">
            <span className="bingo-metric">
              내 빙고 <strong>{bingoCount}</strong>
            </span>
            <span className="bingo-metric">
              보드 단어 <strong>{normalizedTiles.length}</strong>
            </span>
          </div>
        </article>

        <article className="bingo-card bingo-grid-card">
          <div className="bingo-card-head">
            <div>
              <p className="mode-label">English Board</p>
              <h3>단어 보드</h3>
            </div>
            <span className="bingo-status-chip">
              {claimedSet.size}개 체크됨
            </span>
          </div>

          <div
            className="bingo-board"
            style={{ "--bingo-board-columns": gridColumns }}
          >
            {gameplayBoardRows.flat().length > 0 ? (
              gameplayBoardRows.flat().map((tile) => {
                const cleanWordId = String(tile.wordId ?? "").trim();
                const isClaimed = claimedSet.has(cleanWordId) || completedSet.has(cleanWordId);
                const isLocked = lockedSet.has(cleanWordId);
                const normalizedTileWordId = normalizeWord(cleanWordId);
                const isCurrentById = Boolean(normalizedCurrentWordId)
                  && normalizedTileWordId === normalizedCurrentWordId;
                const isCurrentByText = Boolean(normalizedCurrentWord)
                  && normalizeWord(tile.word) === normalizedCurrentWord;
                const isCallableChoice = isCurrentById || isCurrentByText;

                return (
                  <button
                    key={tile.id}
                    type="button"
                    className={
                      isClaimed
                        ? "bingo-tile bingo-tile-claimed"
                        : isLocked
                          ? "bingo-tile bingo-tile-locked"
                          : "bingo-tile"
                    }
                    onClick={() => {
                      if (!canContinue || isClaimed || isLocked) {
                        return;
                      }

                      if (!hasCurrentWord) {
                        setLocalError("선생님이 부른 단어가 아직 없습니다.");
                        return;
                      }

                      if (!isCallableChoice) {
                        setLocalError("현재 호출된 단어만 체크할 수 있습니다.");
                        return;
                      }

                      setLocalError("");
                      onCheckWord?.(cleanWordId);
                    }}
                    disabled={!canContinue || isClaimed || isLocked}
                  >
                    {isClaimed ? (
                      <span className="bingo-tile-claimed-badge">체크 완료</span>
                    ) : null}
                    <strong>{tile.word}</strong>
                    {tile.meaning ? <small>{tile.meaning}</small> : null}
                  </button>
                );
              })
            ) : (
              <div className="bingo-empty-state">보드 단어가 아직 없습니다.</div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
