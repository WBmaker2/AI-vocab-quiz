export function getTeacherBingoBoardLabel(boardSize) {
  return boardSize ? `${boardSize}x${boardSize}` : "단어 부족";
}

export function getTeacherBingoAvailableUnits(bingo, fallbackUnits) {
  return bingo?.availableUnits ?? fallbackUnits ?? [];
}

export function getTeacherBingoSelectedUnits(bingo) {
  return bingo?.selectedUnits ?? [];
}

export function normalizeStudent(student, index) {
  if (typeof student === "string") {
    return {
      id: `student-${index}-${student}`,
      name: student,
      bingoCount: 0,
      connected: false,
      status: "",
    };
  }

  if (!student || typeof student !== "object") {
    return {
      id: `student-${index}`,
      name: "",
      bingoCount: 0,
      connected: false,
      status: "",
    };
  }

  const name = String(student.name ?? student.studentName ?? "").trim();
  const bingoCount = Math.max(
    0,
    Number(
      student.bingoCount
      ?? student.bingoLines
      ?? student.bingo
      ?? student.bingos
      ?? 0,
    ) || 0,
  );

  return {
    id: String(student.id ?? student.studentId ?? `${name || "student"}-${index}`),
    name,
    bingoCount,
    connected: student.connected !== false,
    status: String(student.status ?? "").trim(),
  };
}

export function normalizeWordOption(option, index, calledWordIds, currentWordId) {
  const id = String(option?.id ?? option?.wordId ?? `word-${index}`).trim();
  const word = String(option?.word ?? "").trim();
  const meaning = String(option?.meaning ?? "").trim();

  return {
    id,
    word,
    meaning,
    called: calledWordIds.has(id),
    active: id === currentWordId,
  };
}

export function getBingoBucket(count) {
  if (count >= 3) {
    return "3+";
  }

  if (count === 2) {
    return "2";
  }

  if (count === 1) {
    return "1";
  }

  return "0";
}

export function formatCallMode(callMode) {
  if (callMode === "tts") {
    return "TTS";
  }

  if (callMode === "manual") {
    return "직접 선택";
  }

  return "랜덤";
}
