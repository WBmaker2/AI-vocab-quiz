export function normalizeWord(word) {
  return String(word ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function normalizeTile(tile, index) {
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

export function chunkWords(words, chunkSize) {
  const rows = [];

  for (let index = 0; index < words.length; index += chunkSize) {
    rows.push(words.slice(index, index + chunkSize));
  }

  return rows;
}

export function createEmptySetupCell(boardSize, index) {
  return {
    index,
    row: Math.floor(index / boardSize),
    column: index % boardSize,
    wordId: "",
    word: "",
    meaning: "",
  };
}

export function createEmptySetupCells(boardSize) {
  return Array.from(
    { length: boardSize * boardSize },
    (_, index) => createEmptySetupCell(boardSize, index),
  );
}

export function createSetupBoardKey(cells) {
  return (Array.isArray(cells) ? cells : [])
    .map((cell) => String(cell?.wordId ?? "").trim())
    .join("|");
}

export function normalizeSetupBoardCells(boardCells, boardSize, availableWords = []) {
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

export function chunkToGrid(boardCells, boardSize) {
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

export function getMillis(value) {
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

export function deriveSetupBoardSize(boardWords, requiredCellCount, availableWords) {
  const boardCount = Array.isArray(boardWords) ? boardWords.length : 0;
  const availableCount = Array.isArray(availableWords) ? availableWords.length : 0;
  const cellCount = Number(requiredCellCount) || boardCount || availableCount || 9;

  if (cellCount >= 16) {
    return 4;
  }

  return 3;
}
