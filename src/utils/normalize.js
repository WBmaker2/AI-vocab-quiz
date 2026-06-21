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

  return numericTranscript.split(" ").includes(numericWord);
}
