function shuffle(list) {
  const next = [...list];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function normalizeFishingItems(items) {
  const seen = new Set();

  return items
    .map((item, index) => {
      const word = String(item?.word ?? "").trim();
      const meaning = String(item?.meaning ?? "").trim();
      const id = String(item?.id ?? `${word}__${meaning}__${index}`).trim();

      if (!word || !meaning || !id) {
        return null;
      }

      const dedupeKey = `${word.toLowerCase()}__${meaning}`;
      if (seen.has(dedupeKey)) {
        return null;
      }

      seen.add(dedupeKey);

      return {
        id,
        word,
        meaning,
      };
    })
    .filter(Boolean);
}

function createCandidateMotion(index) {
  const top = 12 + ((index * 14) % 58);
  const duration = 10 + (index % 4) * 1.3;
  const delay = (index % 3) * -1.25;
  const drift = (index % 2 === 0 ? 10 : -10) + index * 1.5;
  const scale = 0.96 + (index % 3) * 0.04;

  return {
    top,
    duration,
    delay,
    drift,
    scale,
  };
}

export function createFishingRound(items, usedWordIds = [], candidateCount = 6) {
  const normalizedItems = normalizeFishingItems(items);

  if (normalizedItems.length < 2) {
    return null;
  }

  const usedIds = new Set(usedWordIds);
  const unseen = normalizedItems.filter((item) => !usedIds.has(item.id));
  const answerPool = unseen.length > 0 ? unseen : normalizedItems;
  const answer = answerPool[Math.floor(Math.random() * answerPool.length)];
  const availableDistractors = normalizedItems.filter((item) => item.id !== answer.id);
  const totalCandidates = clamp(candidateCount, 2, normalizedItems.length);
  const distractors = shuffle(availableDistractors).slice(0, totalCandidates - 1);
  const candidates = shuffle([answer, ...distractors]).map((item, index) => ({
    ...item,
    motion: createCandidateMotion(index),
  }));

  return {
    id: `${answer.id}__${Date.now()}`,
    answer,
    candidates,
  };
}

export function calculateFishingScore({ isCorrect, reactionMs }) {
  if (!isCorrect) {
    return -30;
  }

  const safeReactionMs = Math.max(0, Number(reactionMs) || 0);

  if (safeReactionMs <= 2000) {
    return 140;
  }

  if (safeReactionMs <= 4000) {
    return 120;
  }

  return 100;
}

export function formatAverageReactionTime(totalReactionMs, correctCount) {
  if (!correctCount || totalReactionMs <= 0) {
    return "기록 없음";
  }

  return `${(totalReactionMs / correctCount / 1000).toFixed(1)}초`;
}
