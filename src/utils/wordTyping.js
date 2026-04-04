function normalizeWordPart(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function toPositiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function createTypingId(word, meaning, index) {
  return `${normalizeWordPart(word).toLowerCase()}__${normalizeWordPart(meaning)}__${index}`;
}

export function normalizeTypingAnswer(value) {
  return normalizeWordPart(value).toLowerCase();
}

export function normalizeTypingItems(items) {
  return (Array.isArray(items) ? items : [])
    .map((item, index) => {
      const word = normalizeWordPart(item?.word);
      const meaning = normalizeWordPart(item?.meaning);
      const normalizedWord = normalizeTypingAnswer(word);
      const letterCount = [...word].filter((character) => /\S/.test(character)).length;

      return {
        id: createTypingId(word, meaning, index),
        word,
        meaning,
        normalizedWord,
        letterCount,
      };
    })
    .filter((item) => item.word && item.meaning);
}

export function isTypingAnswerCorrect(input, expectedWord) {
  return normalizeTypingAnswer(input) === normalizeTypingAnswer(expectedWord);
}

export function createTypingHint(word) {
  const characters = [...normalizeWordPart(word)];
  const visibleIndexes = characters
    .map((character, index) => (/\S/.test(character) ? index : -1))
    .filter((index) => index >= 0);

  if (visibleIndexes.length <= 2) {
    return characters.join(' ');
  }

  const firstIndex = visibleIndexes[0];
  const lastIndex = visibleIndexes[visibleIndexes.length - 1];
  const tokens = characters.map((character, index) => {
    if (!/\S/.test(character)) {
      return '/';
    }

    if (index === firstIndex || index === lastIndex) {
      return character.toLowerCase();
    }

    return '_';
  });

  return tokens.join(' ').replace(/\s*\/\s*/g, '   ');
}

export function calculateTypingScore({
  attemptsUsed,
  answerSeconds,
  usedHint,
  combo,
}) {
  const safeAttempts = Math.max(1, Math.floor(Number(attemptsUsed) || 1));
  const safeSeconds = Math.max(0, Number(answerSeconds) || 0);
  const safeCombo = Math.max(0, Math.floor(Number(combo) || 0));

  const baseScore = 100;
  const attemptPenalty = Math.max(0, safeAttempts - 1) * 10;
  const timeBonus = safeSeconds <= 2 ? 20 : safeSeconds <= 4 ? 12 : safeSeconds <= 6 ? 6 : 0;
  const comboBonus = Math.min(Math.max(0, safeCombo - 1) * 5, 20);
  const hintPenalty = usedHint ? 10 : 0;

  return Math.max(0, Math.round(baseScore + timeBonus + comboBonus - attemptPenalty - hintPenalty));
}

export function calculateTypingAverageSeconds(totalElapsedMs, completedCount) {
  const safeElapsedMs = toPositiveNumber(totalElapsedMs);
  const safeCompletedCount = Math.max(1, Math.floor(Number(completedCount) || 0));

  return Math.max(0, Number((safeElapsedMs / safeCompletedCount / 1000).toFixed(1)));
}
