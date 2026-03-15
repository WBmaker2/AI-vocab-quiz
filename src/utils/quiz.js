function shuffle(items) {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [
      nextItems[swapIndex],
      nextItems[index],
    ];
  }

  return nextItems;
}

function createStablePairKey(item) {
  return `${String(item.word ?? "").trim().toLowerCase()}__${String(item.meaning ?? "").trim()}`;
}

function getUniqueMeaningItems(items) {
  return Array.from(
    new Map(items.map((item) => [item.meaning, item])).values(),
  );
}

function getUniqueMatchingItems(items) {
  return Array.from(
    new Map(
      items
        .filter((item) => String(item.word ?? "").trim() && String(item.meaning ?? "").trim())
        .map((item) => [createStablePairKey(item), item]),
    ).values(),
  );
}

export function createListeningQuestions(items) {
  const uniqueMeaningItems = getUniqueMeaningItems(items);
  const choiceCount = Math.min(4, uniqueMeaningItems.length);

  return shuffle(items).map((item) => {
    const distractors = shuffle(
      uniqueMeaningItems.filter(
        (candidate) => candidate.meaning !== item.meaning,
      ),
    )
      .slice(0, Math.max(0, choiceCount - 1))
      .map((candidate) => candidate.meaning);

    return {
      id: item.id,
      word: item.word,
      meaning: item.meaning,
      imageHint: item.imageHint,
      exampleSentence: item.exampleSentence,
      choices: shuffle([item.meaning, ...distractors]),
    };
  });
}

export function createSpeakingSequence(items) {
  return shuffle(items).map((item) => ({
    id: item.id,
    word: item.word,
    meaning: item.meaning,
    imageHint: item.imageHint,
    exampleSentence: item.exampleSentence,
  }));
}

function createMeaningCard(pair) {
  return {
    slotId: `left-${pair.id}-${crypto.randomUUID()}`,
    pairId: pair.id,
    label: pair.meaning,
    word: pair.word,
    meaning: pair.meaning,
    side: "meaning",
  };
}

function createWordCard(pair) {
  return {
    slotId: `right-${pair.id}-${crypto.randomUUID()}`,
    pairId: pair.id,
    label: pair.word,
    word: pair.word,
    meaning: pair.meaning,
    side: "word",
  };
}

export function createMatchingGameState(items, visiblePairCount = 5) {
  const allPairs = shuffle(
    getUniqueMatchingItems(items).map((item) => ({
      id: item.id ?? crypto.randomUUID(),
      word: item.word,
      meaning: item.meaning,
      imageHint: item.imageHint,
      exampleSentence: item.exampleSentence,
    })),
  );
  const initialPairs = allPairs.slice(0, visiblePairCount);

  return {
    totalPairs: allPairs.length,
    remainingPairs: allPairs.slice(visiblePairCount),
    leftCards: shuffle(initialPairs).map(createMeaningCard),
    rightCards: shuffle(initialPairs).map(createWordCard),
  };
}

export function advanceMatchingBoard({
  leftCards,
  rightCards,
  remainingPairs,
  leftIndex,
  rightIndex,
}) {
  const nextLeftCards = [...leftCards];
  const nextRightCards = [...rightCards];
  const nextRemainingPairs = [...remainingPairs];
  const replacementPair = nextRemainingPairs.shift() ?? null;

  if (replacementPair) {
    nextLeftCards[leftIndex] = createMeaningCard(replacementPair);
    nextRightCards[rightIndex] = createWordCard(replacementPair);
  } else {
    nextLeftCards.splice(leftIndex, 1);
    nextRightCards.splice(rightIndex, 1);
  }

  return {
    leftCards: nextLeftCards,
    rightCards: nextRightCards,
    remainingPairs: nextRemainingPairs,
  };
}

export function formatElapsedSeconds(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
  }

  return [minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export function calculateMatchingScore({ solvedPairs, elapsedSeconds }) {
  return Math.max(0, solvedPairs * 100 - Math.floor(elapsedSeconds));
}
