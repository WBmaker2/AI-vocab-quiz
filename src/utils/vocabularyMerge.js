function normalizeVocabularyKeyText(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function createVocabularyContentKey(item) {
  return `${normalizeVocabularyKeyText(item.word)}__${normalizeVocabularyKeyText(item.meaning)}`;
}

function toPlainVocabularyItem(item) {
  return {
    word: String(item.word ?? "").trim(),
    meaning: String(item.meaning ?? "").trim(),
    imageHint: String(item.imageHint ?? "").trim(),
    exampleSentence: String(item.exampleSentence ?? "").trim(),
  };
}

export function mergeVocabularyItems(existingItems, importedItems) {
  const mergedItems = [];
  const indexByKey = new Map();
  let duplicateCount = 0;
  let addedCount = 0;

  function upsertItem(item, source) {
    const plainItem = toPlainVocabularyItem(item);

    if (!plainItem.word || !plainItem.meaning) {
      return;
    }

    const key = createVocabularyContentKey(plainItem);
    const existingIndex = indexByKey.get(key);

    if (existingIndex === undefined) {
      indexByKey.set(key, mergedItems.length);
      mergedItems.push(plainItem);
      if (source === "imported") {
        addedCount += 1;
      }
      return;
    }

    duplicateCount += 1;

    if (source === "imported") {
      const current = mergedItems[existingIndex];
      mergedItems[existingIndex] = {
        ...current,
        imageHint: current.imageHint || plainItem.imageHint,
        exampleSentence: current.exampleSentence || plainItem.exampleSentence,
      };
    }
  }

  existingItems.forEach((item) => upsertItem(item, "existing"));
  importedItems.forEach((item) => upsertItem(item, "imported"));

  return {
    mergedItems,
    addedCount,
    duplicateCount,
  };
}
