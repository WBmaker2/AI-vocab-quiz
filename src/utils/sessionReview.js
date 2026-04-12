export function createSessionReviewKey(item) {
  return `${String(item.word ?? "").trim().toLowerCase()}__${String(item.meaning ?? "").trim()}`;
}

export function registerSessionReviewMiss(
  entries,
  item,
  sourceActivityType,
  now = Date.now(),
) {
  const reviewKey = createSessionReviewKey(item);
  const existing = entries.find((entry) => entry.reviewKey === reviewKey);

  if (!existing) {
    return [
      ...entries,
      {
        reviewKey,
        id: item.id ?? reviewKey,
        word: item.word,
        meaning: item.meaning,
        imageHint: item.imageHint ?? "",
        exampleSentence: item.exampleSentence ?? "",
        sourceActivityType,
        wrongCount: 1,
        lastWrongAt: now,
      },
    ];
  }

  return entries.map((entry) =>
    entry.reviewKey === reviewKey
      ? { ...entry, wrongCount: entry.wrongCount + 1, lastWrongAt: now }
      : entry,
  );
}

export function buildSessionReviewItems(entries, limit = 5) {
  return [...entries]
    .sort((left, right) => {
      if (right.wrongCount !== left.wrongCount) {
        return right.wrongCount - left.wrongCount;
      }

      return right.lastWrongAt - left.lastWrongAt;
    })
    .slice(0, limit);
}
