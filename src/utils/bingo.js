function shuffle(items, random = Math.random) {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [
      nextItems[swapIndex],
      nextItems[index],
    ];
  }

  return nextItems;
}

export function normalizeBingoText(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeBingoWordKey(value) {
  return normalizeBingoText(value)
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s_-]/gi, "")
    .replace(/\s+/g, "_");
}

export function createBingoWordId(item) {
  const explicitId = normalizeBingoText(item?.id);
  if (explicitId) {
    return explicitId;
  }

  const wordKey = normalizeBingoWordKey(item?.word);
  const meaningKey = normalizeBingoWordKey(item?.meaning);
  const fallbackKey = [wordKey, meaningKey].filter(Boolean).join("__");

  if (fallbackKey) {
    return fallbackKey;
  }

  return `bingo_${crypto.randomUUID()}`;
}

export function normalizeBingoItems(items) {
  const seen = new Set();

  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const word = normalizeBingoText(item?.word);
      const meaning = normalizeBingoText(item?.meaning);
      const imageHint = normalizeBingoText(item?.imageHint);
      const exampleSentence = normalizeBingoText(item?.exampleSentence);
      const id = createBingoWordId(item);

      return {
        id,
        word,
        meaning,
        imageHint,
        exampleSentence,
      };
    })
    .filter((item) => {
      if (!item.word || !item.meaning) {
        return false;
      }

      if (seen.has(item.id)) {
        return false;
      }

      seen.add(item.id);
      return true;
    });
}

export function determineBingoBoardSize(itemCount) {
  const safeItemCount = Number(itemCount);

  if (!Number.isFinite(safeItemCount) || safeItemCount < 9) {
    throw new Error("Bingo requires at least 9 words.");
  }

  if (safeItemCount >= 16) {
    return 4;
  }

  return 3;
}

function getBoardCellIndexes(boardSize) {
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

export function canMarkBingoCell({
  activeWordId,
  cellWordId,
  alreadyMarked,
}) {
  return Boolean(
    normalizeBingoText(activeWordId)
      && normalizeBingoText(cellWordId)
      && normalizeBingoText(activeWordId) === normalizeBingoText(cellWordId)
      && !alreadyMarked,
  );
}

export function computeBingoLines(markedWordIds, boardCells, boardSize) {
  const cleanMarkedWordIds = Array.from(
    new Set((Array.isArray(markedWordIds) ? markedWordIds : []).filter(Boolean)),
  );
  const cleanBoardCells = Array.isArray(boardCells) ? boardCells : [];
  const boardShape = getBoardCellIndexes(Number(boardSize));

  if (!boardShape) {
    return {
      bingoLines: 0,
      completedLineKeys: [],
    };
  }

  const completedLineKeys = boardShape.lines
    .map((line, lineIndex) => ({
      key: `line-${lineIndex}`,
      cellIndexes: line,
    }))
    .filter((line) =>
      line.cellIndexes.every((index) => {
        const cell = cleanBoardCells[index];
        return Boolean(
          cell?.wordId && cleanMarkedWordIds.includes(String(cell.wordId ?? "").trim()),
        );
      }),
    )
    .map((line) => line.key);

  return {
    bingoLines: completedLineKeys.length,
    completedLineKeys,
  };
}

export function selectNextBingoWord(items, calledWordIds = [], random = Math.random) {
  const cleanItems = normalizeBingoItems(items);
  const calledWordIdSet = new Set(
    (Array.isArray(calledWordIds) ? calledWordIds : [])
      .map((value) => normalizeBingoText(value))
      .filter(Boolean),
  );
  const remainingItems = cleanItems.filter((item) => !calledWordIdSet.has(item.id));

  if (remainingItems.length === 0) {
    return null;
  }

  return shuffle(remainingItems, random)[0];
}

export function createBingoSessionCode(length = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const safeLength = Math.max(4, Math.floor(Number(length) || 0));
  let code = "";

  for (let index = 0; index < safeLength; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

export function summarizeBingoPlayerStatuses(players) {
  const cleanPlayers = Array.isArray(players) ? players : [];

  return cleanPlayers.reduce(
    (summary, player) => {
      const bingoLines = Math.max(0, Math.floor(Number(player?.bingoLines ?? 0)));
      const entry = {
        playerId: String(player?.playerId ?? player?.id ?? "").trim(),
        studentName: normalizeBingoText(player?.studentName),
        bingoLines,
      };

      if (bingoLines >= 3) {
        summary.threePlus.push(entry);
      } else if (bingoLines === 2) {
        summary.two.push(entry);
      } else if (bingoLines === 1) {
        summary.one.push(entry);
      } else {
        summary.waiting.push(entry);
      }

      return summary;
    },
    {
      waiting: [],
      one: [],
      two: [],
      threePlus: [],
    },
  );
}
