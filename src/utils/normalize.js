const SMALL_NUMBER_WORDS = new Map([
  ["zero", 0],
  ["one", 1],
  ["two", 2],
  ["three", 3],
  ["four", 4],
  ["five", 5],
  ["six", 6],
  ["seven", 7],
  ["eight", 8],
  ["nine", 9],
  ["ten", 10],
  ["eleven", 11],
  ["twelve", 12],
  ["thirteen", 13],
  ["fourteen", 14],
  ["fifteen", 15],
  ["sixteen", 16],
  ["seventeen", 17],
  ["eighteen", 18],
  ["nineteen", 19],
]);

const TENS_NUMBER_WORDS = new Map([
  ["twenty", 20],
  ["thirty", 30],
  ["forty", 40],
  ["fifty", 50],
  ["sixty", 60],
  ["seventy", 70],
  ["eighty", 80],
  ["ninety", 90],
]);

const PROTECTED_SPEECH_CONFUSIONS = new Set([
  "sheep|ship",
  "led|red",
  "lice|rice",
  "three|tree",
]);

function isProtectedSpeechPair(left, right) {
  return PROTECTED_SPEECH_CONFUSIONS.has([left, right].sort().join("|"));
}

export function hasProtectedSpeechConfusion(transcript, expectedWord) {
  const normalizedTranscript = normalizeSpeechText(transcript);
  const normalizedExpected = normalizeSpeechText(expectedWord);

  if (!normalizedTranscript || !normalizedExpected || normalizedTranscript === normalizedExpected) {
    return false;
  }

  const expectedTokens = normalizedExpected.split(" ");
  return normalizedTranscript.split(" ").some((transcriptToken) => {
    return expectedTokens.some((expectedToken) => {
      return isProtectedSpeechPair(transcriptToken, expectedToken);
    });
  });
}

export function normalizeSpeechText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeNumericToken(token) {
  return /^\d+$/.test(token) ? String(Number(token)) : token;
}

function readNumberWord(tokens, index) {
  const token = tokens[index];

  if (TENS_NUMBER_WORDS.has(token)) {
    const nextToken = tokens[index + 1];
    const nextValue = SMALL_NUMBER_WORDS.get(nextToken);

    if (nextValue > 0 && nextValue < 10) {
      return {
        value: TENS_NUMBER_WORDS.get(token) + nextValue,
        length: 2,
      };
    }

    return {
      value: TENS_NUMBER_WORDS.get(token),
      length: 1,
    };
  }

  if (SMALL_NUMBER_WORDS.has(token)) {
    return {
      value: SMALL_NUMBER_WORDS.get(token),
      length: 1,
    };
  }

  return null;
}

export function normalizeSpeechNumberText(value) {
  const tokens = normalizeSpeechText(value).split(" ").filter(Boolean);
  const normalizedTokens = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const numberWord = readNumberWord(tokens, index);

    if (numberWord) {
      normalizedTokens.push(String(numberWord.value));
      index += numberWord.length - 1;
      continue;
    }

    normalizedTokens.push(normalizeNumericToken(tokens[index]));
  }

  return normalizedTokens.join(" ");
}

export function isSpeechMatch(transcript, expectedWord) {
  const normalizedTranscript = normalizeSpeechText(transcript);
  const normalizedWord = normalizeSpeechText(expectedWord);

  if (!normalizedTranscript || !normalizedWord) {
    return false;
  }

  if (normalizedTranscript === normalizedWord) {
    return true;
  }

  const transcriptTokens = normalizedTranscript.split(" ");
  const expectedTokens = normalizedWord.split(" ");
  const hasProtectedTokenPair = expectedTokens.length === transcriptTokens.length
    && expectedTokens.some((token, index) => isProtectedSpeechPair(transcriptTokens[index], token));

  if (
    isProtectedSpeechPair(normalizedTranscript, normalizedWord)
    || hasProtectedTokenPair
    || (
      expectedTokens.length === 1
      && transcriptTokens.some((token) => isProtectedSpeechPair(token, normalizedWord))
    )
  ) {
    return false;
  }

  if (normalizedTranscript.split(" ").includes(normalizedWord)) {
    return true;
  }

  const numericTranscript = normalizeSpeechNumberText(transcript);
  const numericWord = normalizeSpeechNumberText(expectedWord);

  if (!numericTranscript || !numericWord) {
    return false;
  }

  if (numericTranscript === numericWord) {
    return true;
  }

  if (numericTranscript.split(" ").includes(numericWord)) {
    return true;
  }

  if (/\d/.test(normalizedTranscript) || /\d/.test(normalizedWord)) {
    return false;
  }

  const expectedTokenCount = normalizedWord.split(" ").filter(Boolean).length;
  const transcriptWindows = getSpeechWindows(
    normalizedTranscript,
    expectedTokenCount,
  );
  const compactWord = compactNormalizedSpeechText(normalizedWord);

  if (transcriptWindows.some(
    (window) => compactNormalizedSpeechText(window) === compactWord,
  )) {
    return true;
  }

  const expectedPhonetic = normalizeSpeechPhoneticText(normalizedWord);
  if (!expectedPhonetic) {
    return false;
  }

  return transcriptWindows.some((window) => {
    const candidatePhonetic = normalizeSpeechPhoneticText(window);
    return isSpeechPhoneticMatch(candidatePhonetic, expectedPhonetic);
  });
}
function compactNormalizedSpeechText(value) {
  return value.replace(/\s+/g, "");
}

function getSpeechWindows(normalizedText, expectedTokenCount) {
  const tokens = normalizedText.split(" ").filter(Boolean);
  const maxWindowSize = Math.min(
    tokens.length,
    Math.max(1, expectedTokenCount + 1),
  );
  const windows = [];

  for (let start = 0; start < tokens.length; start += 1) {
    for (
      let size = 1;
      size <= maxWindowSize && start + size <= tokens.length;
      size += 1
    ) {
      windows.push(tokens.slice(start, start + size).join(" "));
    }
  }

  return windows;
}

function normalizeSpeechPhoneticText(value) {
  let text = compactNormalizedSpeechText(normalizeSpeechText(value));

  text = text
    .replace(/^kn/, "n")
    .replace(/^gn/, "n")
    .replace(/^ps/, "s")
    .replace(/sch/g, "sk")
    .replace(/tch/g, "ch")
    .replace(/dge/g, "j")
    .replace(/ph/g, "f")
    .replace(/ck/g, "k")
    .replace(/qu/g, "kw")
    .replace(/wr/g, "r")
    .replace(/wh/g, "w")
    .replace(/gh(?=t|$)/g, "")
    .replace(/th/g, "t")
    .replace(/c(?=[eiy])/g, "s")
    .replace(/c/g, "k")
    .replace(/q/g, "k")
    .replace(/g(?=[eiy])/g, "j")
    .replace(/x/g, "ks")
    .replace(/y/g, "i")
    .replace(/([aeiou])\1+/g, "$1")
    .replace(/(.)\1+/g, "$1");

  if (text.length > 3) {
    text = text.replace(/e$/g, "");
  }

  return text;
}
function getSpeechConsonantSkeleton(value) {
  return value.replace(/[aeiou]/g, "");
}

function calculateSpeechEditDistance(left, right, limit) {
  if (Math.abs(left.length - right.length) > limit) {
    return limit + 1;
  }

  let previousRow = Array.from(
    { length: right.length + 1 },
    (_, index) => index,
  );

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const currentRow = [leftIndex];

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      const distance = Math.min(
        previousRow[rightIndex] + 1,
        currentRow[rightIndex - 1] + 1,
        previousRow[rightIndex - 1] + substitutionCost,
      );
      currentRow.push(distance);
    }

    previousRow = currentRow;
  }

  return previousRow[right.length];
}

function isSpeechPhoneticMatch(candidate, expected) {
  if (candidate === expected) {
    return true;
  }

  if (candidate.length < 5 || expected.length < 5) {
    return false;
  }

  if (getSpeechConsonantSkeleton(candidate) !== getSpeechConsonantSkeleton(expected)) {
    return false;
  }

  if (
    candidate[0] !== expected[0] ||
    candidate[candidate.length - 1] !== expected[expected.length - 1]
  ) {
    return false;
  }

  return calculateSpeechEditDistance(candidate, expected, 1) <= 1;
}
