import {
  isSpeechMatch,
  hasProtectedSpeechConfusion,
  normalizeSpeechNumberText,
  normalizeSpeechText,
} from "./normalize.js";

const MAX_SPEECH_CANDIDATES = 3;

function compactSpeechText(value) {
  return normalizeSpeechText(value).replace(/\s+/g, "");
}

function hasExactSpeechWindow(candidate, expected) {
  const candidateTokens = normalizeSpeechText(candidate).split(" ").filter(Boolean);
  const expectedTokens = normalizeSpeechText(expected).split(" ").filter(Boolean);

  if (candidateTokens.length === 0 || expectedTokens.length === 0) {
    return false;
  }

  for (let start = 0; start <= candidateTokens.length - expectedTokens.length; start += 1) {
    if (candidateTokens.slice(start, start + expectedTokens.length).join(" ") === expectedTokens.join(" ")) {
      return true;
    }
  }

  return false;
}

function getCandidateText(result) {
  return String(result?.transcript ?? "").trim();
}

export function extractSpeechCandidates(event, limit = MAX_SPEECH_CANDIDATES) {
  const candidates = [];
  const maxCandidates = Math.max(1, Math.min(MAX_SPEECH_CANDIDATES, Number(limit) || MAX_SPEECH_CANDIDATES));

  for (const result of Array.from(event?.results ?? [])) {
    if (result?.isFinal === false) {
      continue;
    }

    for (const alternative of Array.from(result ?? [])) {
      const candidate = getCandidateText(alternative);

      if (!candidate || candidates.includes(candidate)) {
        continue;
      }

      candidates.push(candidate);
      if (candidates.length >= maxCandidates) {
        return candidates;
      }
    }
  }

  return candidates;
}

function calculateEditDistance(left, right, limit = 1) {
  if (Math.abs(left.length - right.length) > limit) {
    return limit + 1;
  }

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current.push(Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      ));
    }

    previous = current;
  }

  return previous[right.length];
}

function isSingleAdjacentTransposition(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  let mismatchIndex = -1;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      mismatchIndex = index;
      break;
    }
  }

  if (mismatchIndex < 0 || mismatchIndex + 1 >= left.length) {
    return false;
  }

  if (
    left[mismatchIndex] !== right[mismatchIndex + 1]
    || left[mismatchIndex + 1] !== right[mismatchIndex]
  ) {
    return false;
  }

  return left.slice(mismatchIndex + 2) === right.slice(mismatchIndex + 2);
}

function getConsonantSkeleton(value) {
  return value.replace(/[aeiou]/g, "");
}

function hasDifferentNumberMeaning(candidate, expected) {
  const normalizedCandidate = normalizeSpeechNumberText(candidate);
  const normalizedExpected = normalizeSpeechNumberText(expected);
  const hasNumber = /\d/.test(normalizedCandidate) || /\d/.test(normalizedExpected);

  return hasNumber && normalizedCandidate !== normalizedExpected;
}

function isWholeCandidateMatch(candidate, expected) {
  const normalizedCandidate = normalizeSpeechText(candidate);
  const normalizedExpected = normalizeSpeechText(expected);

  if (!normalizedCandidate || !normalizedExpected) {
    return false;
  }

  if (normalizedCandidate === normalizedExpected) {
    return true;
  }

  if (normalizeSpeechNumberText(candidate) === normalizeSpeechNumberText(expected)) {
    return true;
  }

  if (compactSpeechText(candidate) === compactSpeechText(expected)) {
    return true;
  }

  if (hasExactSpeechWindow(candidate, expected)) {
    return true;
  }

  if (hasProtectedSpeechConfusion(candidate, expected)) {
    return false;
  }

  return isSpeechMatch(candidate, expected);
}

function isConservativeNearCandidate(candidate, expected) {
  const normalizedCandidate = normalizeSpeechText(candidate);
  const normalizedExpected = normalizeSpeechText(expected);

  if (!normalizedCandidate || !normalizedExpected || hasDifferentNumberMeaning(candidate, expected)) {
    return false;
  }

  const candidateTokens = normalizedCandidate.split(" ");
  const expectedTokens = normalizedExpected.split(" ");

  if (candidateTokens.length !== 1 || expectedTokens.length !== 1) {
    return false;
  }

  if (normalizedCandidate.length < 5 || normalizedExpected.length < 5) {
    return false;
  }

  if (
    normalizedCandidate[0] !== normalizedExpected[0]
    || getConsonantSkeleton(normalizedCandidate) !== getConsonantSkeleton(normalizedExpected)
  ) {
    return false;
  }

  return calculateEditDistance(normalizedCandidate, normalizedExpected, 1) <= 1
    || isSingleAdjacentTransposition(normalizedCandidate, normalizedExpected);
}

export function isSpeakingAnswerAccepted(candidates, expectedWord) {
  const safeCandidates = Array.isArray(candidates)
    ? candidates.slice(0, MAX_SPEECH_CANDIDATES).filter(Boolean)
    : [];
  const primaryCandidate = safeCandidates[0];

  if (!primaryCandidate || !expectedWord) {
    return false;
  }

  if (isWholeCandidateMatch(primaryCandidate, expectedWord)) {
    return true;
  }

  if (!isConservativeNearCandidate(primaryCandidate, expectedWord)) {
    return false;
  }

  return safeCandidates.slice(1).some((candidate) => {
    return normalizeSpeechText(candidate) === normalizeSpeechText(expectedWord)
      || normalizeSpeechNumberText(candidate) === normalizeSpeechNumberText(expectedWord);
  });
}

export { MAX_SPEECH_CANDIDATES };
