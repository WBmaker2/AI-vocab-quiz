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

const WIDE_LANES = [
  { top: 10, left: 6, rangeX: 13, driftY: 14 },
  { top: 12, left: 56, rangeX: -12, driftY: 16 },
  { top: 34, left: 10, rangeX: 15, driftY: 12 },
  { top: 38, left: 58, rangeX: -14, driftY: 18 },
  { top: 61, left: 8, rangeX: 14, driftY: 15 },
  { top: 65, left: 54, rangeX: -13, driftY: 13 },
];

const COMPACT_LANES = [
  { top: 12, left: 7, rangeX: 11, driftY: 12 },
  { top: 16, left: 52, rangeX: -10, driftY: 14 },
  { top: 42, left: 10, rangeX: 12, driftY: 12 },
  { top: 46, left: 50, rangeX: -12, driftY: 14 },
  { top: 68, left: 8, rangeX: 11, driftY: 11 },
  { top: 72, left: 52, rangeX: -10, driftY: 13 },
];

function createCandidateMotion(index, totalCandidates) {
  const lanes = totalCandidates <= 4 ? COMPACT_LANES : WIDE_LANES;
  const lane = lanes[index % lanes.length];
  const duration = 6.8 + (index % 3) * 0.9;
  const delay = (index % 4) * -0.8;
  const scale = 0.98 + (index % 2) * 0.03;

  return {
    top: lane.top,
    left: lane.left,
    rangeX: lane.rangeX,
    duration,
    delay,
    driftY: lane.driftY,
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
  const candidatePool = shuffle([answer, ...distractors]);
  const candidates = candidatePool.map((item, index) => ({
    ...item,
    motion: createCandidateMotion(index, candidatePool.length),
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
