import { normalizeSpeechText } from "./normalize.js";

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

function compactDictationText(value) {
  return normalizeSpeechText(value).replace(/\s+/g, "");
}

export function gradeDictationAnswer(input, expectedWord) {
  const cleanInput = normalizeSpeechText(input);
  const cleanExpected = normalizeSpeechText(expectedWord);

  if (!cleanInput || !cleanExpected) {
    return false;
  }

  if (cleanInput === cleanExpected) {
    return true;
  }

  return compactDictationText(input) === compactDictationText(expectedWord);
}

export function createDictationSequence(items) {
  return shuffle(items)
    .map((item) => ({
      id: item.id,
      word: item.word,
      meaning: item.meaning,
      imageHint: item.imageHint,
      imageUrl: item.imageUrl ?? "",
      exampleSentence: item.exampleSentence,
    }))
    .filter((item) => String(item.word ?? "").trim());
}
