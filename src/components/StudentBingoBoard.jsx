import { useEffect, useMemo, useRef, useState } from "react";

function normalizeWord(word) {
  return String(word ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeTile(tile, index) {
  if (typeof tile === "string") {
    return {
      id: `tile-${index}-${tile}`,
      wordId: `tile-${index}-${tile}`,
      word: tile,
      meaning: "",
    };
  }

  if (!tile || typeof tile !== "object") {
    return {
      id: `tile-${index}`,
      wordId: `tile-${index}`,
      word: "",
      meaning: "",
    };
  }

  return {
    id: String(tile.id ?? tile.word ?? index),
    wordId: String(tile.wordId ?? tile.id ?? tile.word ?? index),
    word: String(tile.word ?? tile.label ?? "").trim(),
    meaning: String(tile.meaning ?? tile.hint ?? "").trim(),
  };
}

function chunkWords(words, chunkSize) {
  const rows = [];

  for (let index = 0; index < words.length; index += chunkSize) {
    rows.push(words.slice(index, index + chunkSize));
  }

  return rows;
}

function createEmptySetupCell(boardSize, index) {
  return {
    index,
    row: Math.floor(index / boardSize),
    column: index % boardSize,
    wordId: "",
    word: "",
    meaning: "",
  };
}

function createEmptySetupCells(boardSize) {
  return Array.from(
    { length: boardSize * boardSize },
    (_, index) => createEmptySetupCell(boardSize, index),
  );
}

function createSetupBoardKey(cells) {
  return (Array.isArray(cells) ? cells : [])
    .map((cell) => String(cell?.wordId ?? "").trim())
    .join("|");
}

function normalizeSetupBoardCells(boardCells, boardSize, availableWords = []) {
  const safeBoardSize = Number(boardSize);
  const cellCount = safeBoardSize * safeBoardSize;
  const emptyBoard = createEmptySetupCells(safeBoardSize);
  const cleanAvailableWords = new Map(
    (Array.isArray(availableWords) ? availableWords : [])
      .map((item, index) => normalizeTile(item, index))
      .filter((item) => item.wordId && item.word),
  );
  const seenWordIds = new Set();

  (Array.isArray(boardCells) ? boardCells : []).forEach((cell, index) => {
    const cleanIndex = Number.isFinite(Number(cell?.index))
      ? Number(cell.index)
      : index;

    if (cleanIndex < 0 || cleanIndex >= cellCount) {
      return;
    }

    const wordId = normalizeWord(cell?.wordId);
    if (!wordId || seenWordIds.has(wordId)) {
      return;
    }

    const fallbackTile = normalizeTile(cell, cleanIndex);
    const sourceTile = cleanAvailableWords.get(wordId) ?? fallbackTile;

    seenWordIds.add(wordId);
    emptyBoard[cleanIndex] = {
      index: cleanIndex,
      row: Math.floor(cleanIndex / safeBoardSize),
      column: cleanIndex % safeBoardSize,
      wordId,
      word: sourceTile.word,
      meaning: sourceTile.meaning,
    };
  });

  return emptyBoard;
}

function chunkToGrid(boardCells, boardSize) {
  const safeBoardSize = Number(boardSize);

  return Array.from({ length: safeBoardSize }, (_, rowIndex) =>
    Array.from({ length: safeBoardSize }, (_, columnIndex) => {
      const cellIndex = rowIndex * safeBoardSize + columnIndex;
      return (
        boardCells[cellIndex] ?? createEmptySetupCell(safeBoardSize, cellIndex)
      );
    }),
  );
}

function getMillis(value) {
  if (!value) {
    return 0;
  }

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (typeof value.seconds === "number") {
    return value.seconds * 1000 + Math.floor((value.nanoseconds ?? 0) / 1e6);
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function deriveSetupBoardSize(boardWords, requiredCellCount, availableWords) {
  const boardCount = Array.isArray(boardWords) ? boardWords.length : 0;
  const availableCount = Array.isArray(availableWords) ? availableWords.length : 0;
  const cellCount = Number(requiredCellCount) || boardCount || availableCount || 9;

  if (cellCount >= 16) {
    return 4;
  }

  return 3;
}

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
  const [draft, setDraft] = useState("");
  const [localError, setLocalError] = useState("");
  const [instructionMessage, setInstructionMessage] = useState("");
  const [selectedSetupWordId, setSelectedSetupWordId] = useState("");
  const [draggedSetupWordId, setDraggedSetupWordId] = useState("");
  const [setupSecondsLeft, setSetupSecondsLeft] = useState(60);
  const [setupDraftCells, setSetupDraftCells] = useState([]);

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
    setInstructionMessage("");
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
  const normalizedCurrentWord = normalizeWord(visibleCurrentWord);
  const normalizedCurrentWordId = String(currentWordId ?? "").trim();
  const currentWordOnBoard = gameplayBoardRows
    .flat()
    .some(
      (tile) =>
        String(tile.wordId ?? "").trim() === normalizedCurrentWordId
        || normalizeWord(tile.word) === normalizedCurrentWord,
    );
  const gridColumns = Math.max(1, gameplayBoardRows[0]?.length ?? 1);
  const currentCallLabel = visibleCurrentWord || "아직 호출된 단어가 없습니다.";
  const canCheckCurrentWord =
    Boolean(visibleCurrentWord) &&
    currentWordOnBoard &&
    !claimedSet.has(normalizedCurrentWordId) &&
    !completedSet.has(normalizedCurrentWordId) &&
    !lockedSet.has(normalizedCurrentWordId);
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

    try {
      await onFinalizeSetup({
        boardCells: setupDraftCells,
        autoFillRemaining,
      });
      clearSelection();
    } catch (error) {
      setLocalError(error?.message ?? "빙고판 배치를 완료하지 못했습니다.");
    }
  }

  if (setupStatus !== "ready") {
    return (
      <section className="workspace-panel bingo-board-shell">
        <div className="section-heading bingo-board-heading">
          <div>
            <p className="mode-label">Student Board</p>
            <h2>{boardTitle}</h2>
            <p className="bingo-host-copy">
              영단어를 드래그하거나 눌러서 내 빙고판을 완성하세요.
            </p>
          </div>
          {onBack ? (
            <button className="ghost-button" type="button" onClick={onBack}>
              나가기
            </button>
          ) : null}
        </div>

        <div className="bingo-session-strip">
          <span className="bingo-session-pill">
            세션 코드 <strong>{sessionCode || "-"}</strong>
          </span>
          {playerName ? (
            <span className="bingo-session-pill">
              학생 <strong>{playerName}</strong>
            </span>
          ) : null}
          <span className="bingo-session-pill bingo-session-pill-accent">
            상태 <strong>배치 중</strong>
          </span>
          {roundLabel ? (
            <span className="bingo-session-pill">
              라운드 <strong>{roundLabel}</strong>
            </span>
          ) : null}
          <span
            className={`bingo-session-pill bingo-session-pill-button ${
              setupCountdownWarning ? "bingo-session-pill-warning" : ""
            }`}
          >
            남은 시간 <strong>{setupSecondsLeft}초</strong>
          </span>
        </div>

        <div className="bingo-setup-grid">
          <article className="bingo-card bingo-setup-board-card">
            <div className="bingo-card-head">
              <div>
                <p className="mode-label">Board Setup</p>
                <h3>빙고판 배치</h3>
              </div>
              <span className="bingo-status-chip">
                {setupBoardComplete ? "완성됨" : `${setupCountLabel} 배치`}
              </span>
            </div>

            <p className="bingo-call-helper">
              아래 카드들을 빈 칸에 드래그하거나, 카드를 먼저 눌러서 칸을 직접
              선택해 배치하세요. 60초 안에 모두 채우지 못하면 남은 칸은 자동
              완성됩니다.
            </p>

            <div
              className="bingo-setup-board"
              style={{ "--bingo-board-columns": setupBoardSize }}
            >
              {setupGridRows.flat().map((cell, index) => {
                const isSelected = selectedSetupWordId === cell.wordId && Boolean(cell.wordId);
                return (
                  <button
                    key={cell.wordId || `setup-cell-${index}`}
                    type="button"
                    className={
                      cell.wordId
                        ? `bingo-setup-cell bingo-setup-cell-filled ${
                            isSelected ? "bingo-setup-cell-selected" : ""
                          }`
                        : `bingo-setup-cell bingo-setup-cell-empty ${
                            setupCountdownWarning ? "bingo-setup-cell-warning" : ""
                          }`
                    }
                    onClick={() => handleSetupCellClick(cell, index)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleSetupCellDrop(event, index)}
                    draggable={Boolean(cell.wordId)}
                    onDragStart={
                      cell.wordId
                        ? (event) => {
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData("text/plain", cell.wordId);
                            handleSetupBoardDragStart(cell.wordId);
                          }
                        : undefined
                    }
                  >
                    {cell.wordId ? (
                      <>
                        <strong>{cell.word}</strong>
                        {cell.meaning ? <small>{cell.meaning}</small> : null}
                      </>
                    ) : (
                      <span>빈 칸</span>
                    )}
                  </button>
                );
              })}
            </div>

            {localError ? <p className="bingo-host-status bingo-host-status-error">{localError}</p> : null}
            {instructionMessage ? (
              <p className="bingo-host-status">{instructionMessage}</p>
            ) : null}
            {statusMessage ? <p className="bingo-host-status">{statusMessage}</p> : null}

            <div className="toolbar-row">
              <button
                type="button"
                className="primary-button"
                onClick={() => handleFinalizeSetup(false)}
                disabled={!setupBoardComplete || actionLoading}
              >
                {actionLoading ? "빙고판 확정 중..." : "빙고판 배치 완료"}
              </button>
            </div>
          </article>

          <article className="bingo-card bingo-setup-tray-card">
            <div className="bingo-card-head">
              <div>
                <p className="mode-label">Fishing Pool</p>
                <h3>배치할 영단어 카드</h3>
              </div>
              <span className="bingo-status-chip">
                {trayWords.length}개 남음
              </span>
            </div>

            <p className="bingo-call-helper">
              카드를 눌러 선택한 뒤 빈 칸을 누르거나, 바로 드래그해서 배치할 수
              있습니다. 이미 놓은 카드를 다른 칸으로 옮길 수도 있습니다.
            </p>

            <div className="bingo-setup-tray">
              {trayWords.length > 0 ? (
                trayWords.map((tile) => {
                  const isSelected = selectedSetupWordId === tile.wordId;
                  return (
                    <button
                      key={tile.id}
                      type="button"
                      className={
                        isSelected
                          ? "bingo-setup-word-card bingo-setup-word-card-selected"
                          : "bingo-setup-word-card"
                      }
                      onClick={() => handleSetupWordClick(tile.wordId)}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", tile.wordId);
                        handleSetupTrayDragStart(tile.wordId);
                      }}
                    >
                      <strong>{tile.word}</strong>
                      {tile.meaning ? <small>{tile.meaning}</small> : null}
                    </button>
                  );
                })
              ) : (
                <div className="bingo-empty-state">모든 카드가 배치되었습니다.</div>
              )}
            </div>

            <div className="bingo-metric-row">
              <span className="bingo-metric">
                배치 완료 <strong>{setupDraftCells.filter((cell) => Boolean(cell.wordId)).length}</strong>
              </span>
              <span className="bingo-metric">
                남은 시간 <strong>{setupSecondsLeft}초</strong>
              </span>
            </div>

            <p className={`bingo-host-status ${setupCountdownWarning ? "bingo-host-status-warning" : ""}`}>
              {actionLoading
                ? "선생님에게 내 빙고판을 전달하고 있어요."
                : setupCountdownWarning
                ? "시간이 얼마 남지 않았어요. 남은 칸은 자동으로 채워집니다."
                : "카드를 눌러 선택한 뒤 칸에 배치하세요."}
            </p>
          </article>
        </div>
      </section>
    );
  }

  const boardStateLabel = canContinue ? "진행 중" : "종료됨";

  return (
    <section className="workspace-panel bingo-board-shell">
      <div className="section-heading bingo-board-heading">
        <div>
          <p className="mode-label">Student Board</p>
          <h2>{boardTitle}</h2>
          <p className="bingo-host-copy">
            영어 단어 보드에서 현재 부른 단어만 체크하세요.
          </p>
        </div>
        {onBack ? (
          <button className="ghost-button" type="button" onClick={onBack}>
            나가기
          </button>
        ) : null}
      </div>

      <div className="bingo-session-strip">
        <span className="bingo-session-pill">
          세션 코드 <strong>{sessionCode || "-"}</strong>
        </span>
        {playerName ? (
          <span className="bingo-session-pill">
            학생 <strong>{playerName}</strong>
          </span>
        ) : null}
        <span className="bingo-session-pill bingo-session-pill-accent">
          상태 <strong>{boardStateLabel}</strong>
        </span>
        {roundLabel ? (
          <span className="bingo-session-pill">
            라운드 <strong>{roundLabel}</strong>
          </span>
        ) : null}
        <span className="bingo-session-pill">
          완료 <strong>{setupCompletedAt ? "YES" : "NO"}</strong>
        </span>
      </div>

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
            호출된 단어는 칸으로 강조만 됩니다. 실제 빙고 체크는 보드의 해당 칸을 직접 눌러야 합니다.
          </p>

          <form className="bingo-manual-form" onSubmit={(event) => event.preventDefault()}>
            <label className="field">
              <span>입력</span>
              <input
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={draft}
                placeholder="현재 호출된 영어 단어를 입력"
                onChange={(event) => setDraft(event.target.value)}
                disabled={!canContinue}
              />
            </label>
            <div className="toolbar-row">
              <button
                className="secondary-button"
                type="button"
                disabled={!canCheckCurrentWord || !canContinue}
                onClick={() => {
                  const cleanDraft = normalizeWord(draft);
                  if (!cleanDraft) {
                    setLocalError("영어 단어를 입력해 주세요.");
                    setInstructionMessage("");
                    return;
                  }

                  if (!/^[a-z][a-z'\- ]*$/.test(cleanDraft)) {
                    setLocalError("영어 단어만 입력할 수 있어요.");
                    setInstructionMessage("");
                    return;
                  }

                  if (cleanDraft !== normalizedCurrentWord) {
                    setLocalError("현재 호출된 단어만 체크할 수 있어요.");
                    setInstructionMessage("");
                    return;
                  }

                  if (!currentWordOnBoard) {
                    setLocalError("현재 호출된 단어가 보드에 없습니다.");
                    setInstructionMessage("");
                    return;
                  }

                  if (!canContinue) {
                    setLocalError("세션이 종료되어 더 이상 체크할 수 없습니다.");
                    setInstructionMessage("");
                    return;
                  }

                  setLocalError("");
                  setInstructionMessage("맞는 단어를 찾았어요. 칸 자체는 자동 체크되지 않으니 아래의 해당 칸을 직접 눌러 주세요.");
                }}
              >
                칸 찾기
              </button>
            </div>
          </form>

          {statusMessage ? <p className="bingo-host-status">{statusMessage}</p> : null}
          {errorMessage ? <p className="bingo-host-status bingo-host-status-error">{errorMessage}</p> : null}
          {localError ? <p className="bingo-host-status bingo-host-status-error">{localError}</p> : null}
          {!localError && instructionMessage ? (
            <p className="bingo-host-status">{instructionMessage}</p>
          ) : null}

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
                const isCurrent = cleanWordId === normalizedCurrentWordId;
                const isClaimed = claimedSet.has(cleanWordId) || completedSet.has(cleanWordId);
                const isLocked = lockedSet.has(cleanWordId);

                return (
                  <button
                    key={tile.id}
                    type="button"
                    className={
                      isClaimed
                        ? "bingo-tile bingo-tile-claimed"
                        : isCurrent && canContinue
                          ? "bingo-tile bingo-tile-active"
                          : isLocked
                            ? "bingo-tile bingo-tile-locked"
                            : "bingo-tile"
                    }
                    onClick={() => {
                      if (!canContinue || !isCurrent || isClaimed || isLocked) {
                        return;
                      }
                      setDraft(tile.word);
                      onCheckWord?.(cleanWordId);
                    }}
                    disabled={!canContinue || !isCurrent || isClaimed || isLocked}
                  >
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
