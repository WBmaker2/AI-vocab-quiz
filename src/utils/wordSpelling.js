export const SPELLING_ATTEMPT_LIMIT = 3;

export const SPELLING_SCORE_BY_ATTEMPT = Object.freeze({
  1: 100,
  2: 70,
  3: 40,
});

function normalizeSpellingPart(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeSpellingAnswer(value) {
  return normalizeSpellingPart(value).toLowerCase();
}

function createSpellingId(word, meaning, index) {
  return `${normalizeSpellingAnswer(word)}__${normalizeSpellingPart(meaning)}__${index}`;
}

export function normalizeSpellingItems(items) {
  return (Array.isArray(items) ? items : [])
    .map((item, index) => {
      const word = normalizeSpellingPart(item?.word);
      const meaning = normalizeSpellingPart(item?.meaning);
      const normalizedWord = normalizeSpellingAnswer(word);
      const id = normalizeSpellingPart(item?.id) || createSpellingId(word, meaning, index);
      const letterCount = [...word].filter((character) => /[a-z]/i.test(character)).length;

      if (!word || !normalizedWord || !id) {
        return null;
      }

      return { id, word, meaning, normalizedWord, letterCount };
    })
    .filter(Boolean);
}

export function isSpellingAnswerCorrect(input, expectedWord) {
  return normalizeSpellingAnswer(input) === normalizeSpellingAnswer(expectedWord);
}

export function createSpellingQuestions(items, options = {}) {
  const usedMasksByWord = options.usedMasksByWord ?? new Map();
  const lastSignatureByWord = options.lastSignatureByWord ?? new Map();
  const random = options.random ?? Math.random;

  return (Array.isArray(items) ? items : []).map((item) => {
    const usedSignatures = usedMasksByWord.get(item.normalizedWord) ?? new Set();
    const mask = createSpellingMask(item.word, {
      usedSignatures,
      previousSignature: lastSignatureByWord.get(item.normalizedWord),
      random,
    });
    usedSignatures.add(mask.signature);
    usedMasksByWord.set(item.normalizedWord, usedSignatures);
    lastSignatureByWord.set(item.normalizedWord, mask.signature);

    return { ...item, mask };
  });
}

function isSpellingLetter(character) {
  return /[a-z]/i.test(character);
}

function combinations(values, count) {
  if (count === 0) {
    return [[]];
  }

  const result = [];
  for (let index = 0; index <= values.length - count; index += 1) {
    for (const rest of combinations(values.slice(index + 1), count - 1)) {
      result.push([values[index], ...rest]);
    }
  }
  return result;
}

function createMaskCandidates(letterIndexes, clueCount) {
  const firstIndex = letterIndexes[0];
  const lastIndex = letterIndexes[letterIndexes.length - 1];
  const internalIndexes = letterIndexes.slice(1, -1);

  if (letterIndexes.length <= 4) {
    return combinations(letterIndexes, clueCount);
  }

  if (letterIndexes.length <= 7) {
    return combinations(letterIndexes, clueCount).filter((candidate) =>
      candidate.some((index) => internalIndexes.includes(index)),
    );
  }

  const requiredIndexes = [firstIndex, lastIndex];
  const internalCount = clueCount - requiredIndexes.length;
  return combinations(internalIndexes, internalCount).map((internal) => [
    ...requiredIndexes,
    ...internal,
  ]);
}

function chooseMaskIndexes(candidates, usedSignatures, random, previousSignature) {
  const randomValue = Number(random());
  const safeRandom = Number.isFinite(randomValue) ? randomValue : 0;
  const start = Math.min(candidates.length - 1, Math.max(0, Math.floor(safeRandom * candidates.length)));

  for (let offset = 0; offset < candidates.length; offset += 1) {
    const candidate = candidates[(start + offset) % candidates.length];
    const signature = candidate.join(",");
    if (!usedSignatures.has(signature)) {
      return { candidate, signature };
    }
  }

  const fallbackIndex = (start + 1) % candidates.length;
  const actualPreviousSignature = previousSignature ?? [...usedSignatures].at(-1);
  let fallback = candidates[fallbackIndex] || candidates[0];

  if (candidates.length > 1 && fallback.join(",") === actualPreviousSignature) {
    fallback = candidates[(fallbackIndex + 1) % candidates.length];
  }

  return { candidate: fallback, signature: fallback.join(",") };
}

export function createSpellingMask(word, options = {}) {
  const normalizedWord = normalizeSpellingPart(word).toLowerCase();
  const characters = [...normalizedWord];
  const letterIndexes = characters
    .map((character, index) => (isSpellingLetter(character) ? index : -1))
    .filter((index) => index >= 0);
  const usedSignatures = options.usedSignatures ?? new Set();
  const previousSignature = options.previousSignature;
  const random = options.random ?? Math.random;
  const clueCount = letterIndexes.length === 1
    ? 0
    : letterIndexes.length <= 4
      ? 1
      : letterIndexes.length <= 7
        ? 2
        : letterIndexes.length <= 10
          ? 3
          : 4;
  const candidates = createMaskCandidates(letterIndexes, clueCount);
  if (candidates.length === 0) {
    const separatorCharacters = characters.map((character) => ({
      value: character,
      visible: true,
      separator: true,
    }));

    return {
      characters: separatorCharacters,
      visibleIndexes: [],
      signature: "",
      displayText: normalizedWord,
    };
  }
  const { candidate, signature } = chooseMaskIndexes(
    candidates,
    usedSignatures,
    random,
    previousSignature,
  );
  const visibleSet = new Set(candidate);

  const maskCharacters = characters.map((character, index) => {
    const separator = !isSpellingLetter(character);
    const visible = separator || visibleSet.has(index);
    return { value: character, visible, separator };
  });

  return {
    characters: maskCharacters,
    visibleIndexes: candidate,
    signature,
    displayText: maskCharacters
      .map((character) => (character.visible ? character.value : "_"))
      .join(""),
  };
}

export function calculateSpellingAttemptScore({ attemptsUsed, revealed } = {}) {
  if (revealed) {
    return 10;
  }

  const attempt = Number(attemptsUsed);
  return Number.isInteger(attempt) ? SPELLING_SCORE_BY_ATTEMPT[attempt] ?? 0 : 0;
}

export function calculateSpellingAccuracy(correctCount, questionCount) {
  const safeQuestionCount = Number(questionCount);
  if (!Number.isFinite(safeQuestionCount) || safeQuestionCount <= 0) {
    return 0;
  }

  const safeCorrectCount = Number(correctCount);
  return Math.round(
    (Math.max(0, Number.isFinite(safeCorrectCount) ? safeCorrectCount : 0) / safeQuestionCount) * 100,
  );
}
