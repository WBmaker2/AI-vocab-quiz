
export function normalizeLeaderboardScope(value) {
  return String(value ?? "").trim();
}

export function normalizeLeaderboardText(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}
export function toNonNegativeInteger(value, fieldName) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }

  return Math.max(0, Math.floor(numberValue));
}

export function toNonNegativeNumber(value, fieldName) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }

  return Math.max(0, numberValue);
}

export function validateLeaderboardNumber(value, fieldName, { min = 0, max = Infinity } = {}) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < min || numberValue > max) {
    throw new Error(`${fieldName} is out of range.`);
  }

  return numberValue;
}

export function validateLeaderboardInteger(value, fieldName, options = {}) {
  const numberValue = validateLeaderboardNumber(value, fieldName, options);

  if (!Number.isInteger(numberValue)) {
    throw new Error(`${fieldName} must be an integer.`);
  }

  return numberValue;
}

export function validateMatchingLeaderboardResult({
  score,
  elapsedSeconds,
  solvedPairs,
}) {
  const cleanSolvedPairs = validateLeaderboardInteger(solvedPairs, "solvedPairs", {
    min: 1,
    max: 100,
  });

  return {
    score: validateLeaderboardNumber(score, "score", {
      min: 0,
      max: cleanSolvedPairs * 100,
    }),
    elapsedSeconds: validateLeaderboardInteger(elapsedSeconds, "elapsedSeconds", {
      min: 0,
      max: 7200,
    }),
    solvedPairs: cleanSolvedPairs,
  };
}

export function validateFishingLeaderboardResult({
  score,
  elapsedSeconds,
  correctCount,
  wrongCount,
  missCount,
}) {
  const cleanCorrectCount = validateLeaderboardInteger(correctCount, "correctCount");
  const cleanWrongCount = validateLeaderboardInteger(wrongCount, "wrongCount");
  const cleanMissCount = validateLeaderboardInteger(missCount, "missCount");
  const totalRounds = cleanCorrectCount + cleanWrongCount + cleanMissCount;

  if (totalRounds < 1 || totalRounds > 10) {
    throw new Error("Fishing total rounds is out of range.");
  }

  return {
    score: validateLeaderboardNumber(score, "score", {
      min: 0,
      max: cleanCorrectCount * 140,
    }),
    elapsedSeconds: validateLeaderboardNumber(elapsedSeconds, "elapsedSeconds"),
    correctCount: cleanCorrectCount,
    wrongCount: cleanWrongCount,
    missCount: cleanMissCount,
  };
}

export function validateTypingLeaderboardResult({
  score,
  elapsedSeconds,
  questionCount,
  correctCount,
  accuracy,
  hintUsedCount,
  bestCombo,
}) {
  const cleanQuestionCount = validateLeaderboardInteger(questionCount, "questionCount", {
    min: 1,
    max: 500,
  });
  const cleanCorrectCount = validateLeaderboardInteger(correctCount, "correctCount", {
    min: 0,
    max: cleanQuestionCount,
  });
  const cleanHintUsedCount = validateLeaderboardInteger(hintUsedCount, "hintUsedCount", {
    min: 0,
    max: cleanQuestionCount,
  });
  const cleanBestCombo = validateLeaderboardInteger(bestCombo, "bestCombo", {
    min: 0,
    max: cleanCorrectCount,
  });
  const cleanAccuracy = validateLeaderboardInteger(accuracy, "accuracy", {
    min: 0,
    max: 100,
  });

  if (Math.abs(cleanAccuracy * cleanQuestionCount - cleanCorrectCount * 100) > cleanQuestionCount) {
    throw new Error("accuracy does not match correctCount.");
  }

  return {
    score: validateLeaderboardNumber(score, "score", {
      min: 0,
      max: cleanCorrectCount * 140,
    }),
    elapsedSeconds: validateLeaderboardInteger(elapsedSeconds, "elapsedSeconds", {
      min: 0,
      max: 86400,
    }),
    questionCount: cleanQuestionCount,
    correctCount: cleanCorrectCount,
    accuracy: cleanAccuracy,
    hintUsedCount: cleanHintUsedCount,
    bestCombo: cleanBestCombo,
  };
}
