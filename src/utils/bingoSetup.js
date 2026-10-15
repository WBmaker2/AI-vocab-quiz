import {
  createBingoWordId,
  determineBingoBoardSize,
  normalizeBingoItems,
  normalizeBingoText,
  normalizeBingoWordKey,
  shuffle,
} from "./bingo.js";

export function getBoardCellIndexes(boardSize) {
  if (boardSize === 3) {
    return {
      lines: [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
      ],
    };
  }

  if (boardSize === 4) {
    return {
      lines: [
        [0, 1, 2, 3],
        [4, 5, 6, 7],
        [8, 9, 10, 11],
        [12, 13, 14, 15],
        [0, 4, 8, 12],
        [1, 5, 9, 13],
        [2, 6, 10, 14],
        [3, 7, 11, 15],
        [0, 5, 10, 15],
        [3, 6, 9, 12],
      ],
    };
  }

  return null;
}

export function createBingoBoard(items, boardSize, random = Math.random) {
  const cleanItems = normalizeBingoItems(items);
  const safeBoardSize =
    boardSize ?? determineBingoBoardSize(cleanItems.length);
  const neededCount = safeBoardSize * safeBoardSize;

  if (safeBoardSize !== 3 && safeBoardSize !== 4) {
    throw new Error("Bingo board size must be 3 or 4.");
  }

  if (cleanItems.length < neededCount) {
    throw new Error(
      `Bingo requires at least ${neededCount} unique words for a ${safeBoardSize}x${safeBoardSize} board.`,
    );
  }

  const selectedItems = shuffle(cleanItems, random).slice(0, neededCount);

  const boardCells = selectedItems.map((item, index) => ({
    index,
    row: Math.floor(index / safeBoardSize),
    column: index % safeBoardSize,
    wordId: item.id,
    word: item.word,
    meaning: item.meaning,
    imageHint: item.imageHint,
    exampleSentence: item.exampleSentence,
  }));

  return {
    boardSize: safeBoardSize,
    boardCells,
    boardWordIds: boardCells.map((cell) => cell.wordId),
    items: selectedItems,
  };
}

export function createEmptyBingoBoardCells(boardSize) {
  const safeBoardSize = Number(boardSize);

  if (safeBoardSize !== 3 && safeBoardSize !== 4) {
    throw new Error("Bingo board size must be 3 or 4.");
  }

  return Array.from(
    { length: safeBoardSize * safeBoardSize },
    (_, index) => ({
      index,
      row: Math.floor(index / safeBoardSize),
      column: index % safeBoardSize,
      wordId: "",
      word: "",
      meaning: "",
      imageHint: "",
      exampleSentence: "",
    }),
  );
}

export function createBingoSetupPool(items, boardSize, random = Math.random) {
  const cleanItems = normalizeBingoItems(items);
  const safeBoardSize =
    boardSize ?? determineBingoBoardSize(cleanItems.length);
  const neededCount = safeBoardSize * safeBoardSize;

  if (safeBoardSize !== 3 && safeBoardSize !== 4) {
    throw new Error("Bingo board size must be 3 or 4.");
  }

  if (cleanItems.length < neededCount) {
    throw new Error(
      `Bingo requires at least ${neededCount} unique words for a ${safeBoardSize}x${safeBoardSize} board.`,
    );
  }

  const selectedItems = shuffle(cleanItems, random).slice(0, neededCount);

  return {
    boardSize: safeBoardSize,
    requiredCellCount: neededCount,
    availableWords: selectedItems.map((item) => ({
      id: item.id,
      word: item.word,
      meaning: item.meaning,
      imageHint: item.imageHint,
      exampleSentence: item.exampleSentence,
    })),
  };
}

export function createBingoSetupBoard(items, boardSize, random = Math.random) {
  const setupPool = createBingoSetupPool(items, boardSize, random);

  return {
    ...setupPool,
    boardCells: createEmptyBingoBoardCells(setupPool.boardSize),
    boardWordIds: [],
  };
}

export function finalizeBingoBoardPlacements({
  boardCells,
  availableWords,
  boardSize,
  autoFillRemaining = false,
  random = Math.random,
}) {
  const safeBoardSize = Number(boardSize);
  const requiredCellCount = safeBoardSize * safeBoardSize;

  if (safeBoardSize !== 3 && safeBoardSize !== 4) {
    throw new Error("Bingo board size must be 3 or 4.");
  }

  const cleanCells = createEmptyBingoBoardCells(safeBoardSize);
  const cleanAvailableWords = normalizeBingoItems(availableWords);
  const availableWordMap = new Map(
    cleanAvailableWords.map((item) => [item.id, item]),
  );

  (Array.isArray(boardCells) ? boardCells : []).forEach((cell, index) => {
    const cleanIndex = Number.isFinite(Number(cell?.index))
      ? Number(cell.index)
      : index;
    if (cleanIndex < 0 || cleanIndex >= requiredCellCount) {
      return;
    }

    const placedWordId = normalizeBingoText(cell?.wordId);
    if (!placedWordId) {
      return;
    }

    const selectedItem = availableWordMap.get(placedWordId);
    if (!selectedItem) {
      throw new Error("Placed word is not part of the bingo pool.");
    }

    cleanCells[cleanIndex] = {
      index: cleanIndex,
      row: Math.floor(cleanIndex / safeBoardSize),
      column: cleanIndex % safeBoardSize,
      wordId: selectedItem.id,
      word: selectedItem.word,
      meaning: selectedItem.meaning,
      imageHint: selectedItem.imageHint,
      exampleSentence: selectedItem.exampleSentence,
    };
  });

  const placedWordIdSet = new Set(
    cleanCells.map((cell) => normalizeBingoText(cell.wordId)).filter(Boolean),
  );
  const remainingItems = shuffle(
    cleanAvailableWords.filter((item) => !placedWordIdSet.has(item.id)),
    random,
  );
  const hasEmptyCells = cleanCells.some((cell) => !normalizeBingoText(cell.wordId));

  if (hasEmptyCells && !autoFillRemaining) {
    throw new Error("빙고판의 모든 칸을 먼저 배치해 주세요.");
  }

  if (remainingItems.length < cleanCells.filter((cell) => !normalizeBingoText(cell.wordId)).length) {
    throw new Error("빙고판을 자동으로 채울 단어가 부족합니다.");
  }

  let remainingIndex = 0;
  const finalCells = cleanCells.map((cell, index) => {
    if (normalizeBingoText(cell.wordId)) {
      return cell;
    }

    const nextItem = remainingItems[remainingIndex];
    remainingIndex += 1;

    if (!nextItem) {
      return cell;
    }

    return {
      index,
      row: Math.floor(index / safeBoardSize),
      column: index % safeBoardSize,
      wordId: nextItem.id,
      word: nextItem.word,
      meaning: nextItem.meaning,
      imageHint: nextItem.imageHint,
      exampleSentence: nextItem.exampleSentence,
    };
  });

  const finalBoardWordIds = finalCells
    .map((cell) => normalizeBingoText(cell.wordId))
    .filter(Boolean);

  if (finalBoardWordIds.length !== requiredCellCount) {
    throw new Error("빙고판이 아직 완전히 채워지지 않았습니다.");
  }

  return {
    boardSize: safeBoardSize,
    requiredCellCount,
    boardCells: finalCells,
    boardWordIds: finalBoardWordIds,
    availableWords: cleanAvailableWords,
  };
}
