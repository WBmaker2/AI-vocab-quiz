import { useEffect, useMemo, useState } from "react";

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

export function StudentBingoBoard({
  sessionCode = "",
  playerName = "",
  boardTitle = "영어 단어 빙고 보드",
  boardWords = [],
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
  onCheckWord,
  onBack,
}) {
  const [draft, setDraft] = useState("");
  const [localError, setLocalError] = useState("");
  const [instructionMessage, setInstructionMessage] = useState("");
  const sourceBoard = Array.isArray(boardWords) ? boardWords : [];
  const sourceTiles = Array.isArray(sourceBoard[0]) ? sourceBoard.flat() : sourceBoard;
  const normalizedTiles = useMemo(
    () => sourceTiles.map(normalizeTile).filter((tile) => tile.word),
    [sourceTiles],
  );
  const normalizedBoardRows = useMemo(() => {
    if (Array.isArray(sourceBoard[0])) {
      return sourceBoard.map((row, rowIndex) =>
        row.map((tile, tileIndex) => normalizeTile(tile, rowIndex * 20 + tileIndex)),
      );
    }

    const size = Math.max(1, Math.ceil(Math.sqrt(normalizedTiles.length || 1)));
    return chunkWords(normalizedTiles, size);
  }, [normalizedTiles, sourceBoard]);

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
  const currentWordOnBoard = normalizedBoardRows
    .flat()
    .some(
      (tile) =>
        String(tile.wordId ?? "").trim() === normalizedCurrentWordId
        || normalizeWord(tile.word) === normalizedCurrentWord,
    );
  const gridColumns = Math.max(1, normalizedBoardRows[0]?.length ?? 1);
  const currentCallLabel = visibleCurrentWord || "아직 호출된 단어가 없습니다.";
  const canCheckCurrentWord =
    Boolean(visibleCurrentWord) &&
    currentWordOnBoard &&
    !claimedSet.has(normalizedCurrentWordId) &&
    !completedSet.has(normalizedCurrentWordId) &&
    !lockedSet.has(normalizedCurrentWordId);

  useEffect(() => {
    setLocalError("");
    setInstructionMessage("");
  }, [visibleCurrentWord, sourceBoard]);

  function handleTileClick(tile) {
    const cleanWordId = String(tile.wordId ?? "").trim();
    const cleanWord = normalizeWord(tile.word);
    if (!cleanWord || !canContinue) {
      return;
    }

    if (cleanWordId !== normalizedCurrentWordId) {
      setLocalError("현재 호출된 단어만 체크할 수 있어요.");
      return;
    }

    if (claimedSet.has(cleanWordId) || completedSet.has(cleanWordId)) {
      setLocalError("이미 체크된 단어입니다.");
      return;
    }

    setDraft(tile.word);
    setLocalError("");
    setInstructionMessage("체크했습니다. 호출 단어는 자동 체크되지 않으니 다음 칸도 직접 눌러 주세요.");
    onCheckWord?.(cleanWordId);
  }

  function handleSubmit(event) {
    event.preventDefault();

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

          <form className="bingo-manual-form" onSubmit={handleSubmit}>
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
                type="submit"
                disabled={!canCheckCurrentWord || !canContinue}
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
            {normalizedBoardRows.flat().length > 0 ? (
              normalizedBoardRows.flat().map((tile) => {
                const cleanWord = normalizeWord(tile.word);
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
                    onClick={() => handleTileClick(tile)}
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
