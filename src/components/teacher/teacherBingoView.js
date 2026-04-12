export function getTeacherBingoBoardLabel(boardSize) {
  return boardSize ? `${boardSize}x${boardSize}` : "단어 부족";
}

export function getTeacherBingoAvailableUnits(bingo, fallbackUnits) {
  return bingo?.availableUnits ?? fallbackUnits ?? [];
}

export function getTeacherBingoSelectedUnits(bingo) {
  return bingo?.selectedUnits ?? [];
}
